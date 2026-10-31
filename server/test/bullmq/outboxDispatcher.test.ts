import { afterEach, describe, expect, it, jest } from '@jest/globals'

const eventId = '41c5b449-bf14-4c23-a899-cf611ae1dd1a'
const state: { event: any } = { event: null }
const mockFindMany = jest.fn<(...args: any[]) => Promise<any[]>>()
const mockFindUnique = jest.fn<(...args: any[]) => Promise<any>>()
const mockUpdateMany = jest.fn<(...args: any[]) => Promise<any>>()
const mockQueueAdd = jest.fn<(...args: any[]) => Promise<any>>()

jest.mock('../../config/prisma.js', () => ({ prisma: { outboxEvent: { findMany: mockFindMany, findUnique: mockFindUnique, updateMany: mockUpdateMany } } }))
jest.mock('../../config/redis.js', () => ({ redisConnection: {} }))
jest.mock('bullmq', () => ({ Queue: jest.fn().mockImplementation(() => ({ add: mockQueueAdd })) }))

import { dispatchOutboxOnce, retryOutboxJob, startOutboxDispatcher } from '../../bullmq/outboxDispatcher.js'

const createEvent = () => ({
  id: eventId, dedupeKey: 'order:order-1:process', queue: 'order-processing', jobName: 'process-order',
  payload: { orderId: 'order-1' }, availableAt: new Date(0), lockedUntil: null, leaseToken: null,
  processedAt: null, attempts: 0, createdAt: new Date(0), lastError: null,
  jobGeneration: 0,
})

const reset = () => {
  state.event = createEvent()
  mockFindMany.mockImplementation(async () => {
    const now = Date.now()
    const event = state.event
    if (event.processedAt || event.availableAt.getTime() > now || (event.lockedUntil && event.lockedUntil.getTime() >= now)) return []
    return [{ ...event }]
  })
  mockFindUnique.mockImplementation(async () => state.event ? { attempts: state.event.attempts } : null)
  mockUpdateMany.mockImplementation(async ({ where, data }: any) => {
    const event = state.event
    if (!event || (where.id && where.id !== event.id) ||
      (where.processedAt === null && event.processedAt !== null) ||
      (where.processedAt?.not === null && event.processedAt === null) ||
      (where.attempts !== undefined && event.attempts !== where.attempts) ||
      (where.jobGeneration !== undefined && event.jobGeneration !== where.jobGeneration) ||
      (where.leaseToken !== undefined && event.leaseToken !== where.leaseToken)) return { count: 0 }
    if (where.availableAt?.lte && event.availableAt > where.availableAt.lte) return { count: 0 }
    if (where.OR && !where.OR.some((clause: any) =>
      (clause.lockedUntil === null && event.lockedUntil === null) ||
      (clause.lockedUntil?.lt && (!event.lockedUntil || event.lockedUntil < clause.lockedUntil.lt)))) return { count: 0 }
    if (data.attempts?.increment) event.attempts += data.attempts.increment
    if (data.jobGeneration?.increment) event.jobGeneration += data.jobGeneration.increment
    for (const [key, value] of Object.entries(data)) if (key !== 'attempts' && key !== 'jobGeneration') (event as any)[key] = value
    return { count: 1 }
  })
  mockQueueAdd.mockReset().mockResolvedValue({ id: 'queued-job' })
}

describe('transactional outbox dispatcher leases', () => {
  afterEach(() => { jest.clearAllMocks(); jest.useRealTimers() })

  it('marks an event dispatched after BullMQ accepts its stable job ID', async () => {
    reset()
    await dispatchOutboxOnce()
    expect(mockQueueAdd).toHaveBeenCalledWith('process-order', { orderId: 'order-1' }, expect.objectContaining({ jobId: `outbox-${eventId}-dispatch-0` }))
    expect(state.event.processedAt).toBeInstanceOf(Date)
    expect(state.event.leaseToken).toBeNull()
  })

  it('releases its lease with bounded backoff when Redis rejects the job', async () => {
    reset()
    mockQueueAdd.mockRejectedValueOnce(new Error('Redis unavailable'))
    await dispatchOutboxOnce()
    expect(state.event.processedAt).toBeNull()
    expect(state.event.leaseToken).toBeNull()
    expect(state.event.attempts).toBe(1)
    expect(state.event.availableAt.getTime()).toBeGreaterThan(Date.now())
  })

  it('reuses the same job ID if PostgreSQL fails after queue acceptance', async () => {
    reset()
    mockUpdateMany.mockImplementationOnce(async ({ data }: any) => {
      state.event = { ...state.event, ...data }
      return { count: 1 }
    }).mockRejectedValueOnce(new Error('PostgreSQL unavailable'))
    await expect(dispatchOutboxOnce()).rejects.toThrow('PostgreSQL unavailable')
    const firstToken = state.event.leaseToken
    expect(firstToken).toBeTruthy()
    expect(state.event.attempts).toBe(0)
    state.event.lockedUntil = new Date(Date.now() - 1)
    mockQueueAdd.mockResolvedValueOnce({ id: 'existing-queue-job' })
    await dispatchOutboxOnce()
    expect(mockQueueAdd.mock.calls[0][2]).toMatchObject({ jobId: `outbox-${eventId}-dispatch-0` })
    expect(mockQueueAdd.mock.calls[1][2]).toMatchObject({ jobId: `outbox-${eventId}-dispatch-0` })
    expect(state.event.processedAt).toBeInstanceOf(Date)
  })

  it('fences an expired dispatcher after another dispatcher takes the lease', async () => {
    reset()
    let resolveFirst!: (value: unknown) => void
    mockQueueAdd.mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve }))
    const staleDispatch = dispatchOutboxOnce()
    while (!resolveFirst) await Promise.resolve()
    const oldToken = state.event.leaseToken
    state.event.lockedUntil = new Date(Date.now() - 1)
    await dispatchOutboxOnce()
    const newToken = state.event.leaseToken
    expect(newToken).not.toBe(oldToken)
    expect(state.event.processedAt).toBeInstanceOf(Date)
    resolveFirst({ id: 'accepted-by-stale-dispatcher' })
    await staleDispatch
    expect(state.event.processedAt).toBeInstanceOf(Date)
    expect(state.event.leaseToken).toBeNull()
  })

  it('allows only one of two competing dispatchers to claim the same event', async () => {
    reset()
    await Promise.all([dispatchOutboxOnce(), dispatchOutboxOnce()])
    expect(mockQueueAdd).toHaveBeenCalledTimes(1)
    expect(state.event.processedAt).toBeInstanceOf(Date)
  })

  it('waits for an active dispatch cycle before reporting that it has stopped', async () => {
    reset()
    let finishDispatch!: (value: unknown) => void
    mockQueueAdd.mockImplementationOnce(() => new Promise((resolve) => { finishDispatch = resolve }))
    const stop = startOutboxDispatcher()
    while (!finishDispatch) await Promise.resolve()
    let stopped = false
    const stopping = stop().then(() => { stopped = true })
    await Promise.resolve()
    expect(stopped).toBe(false)
    finishDispatch({ id: 'queued-job' })
    await stopping
    expect(stopped).toBe(true)
  })

  it('maps a final BullMQ failure to the matching dispatch generation only', async () => {
    reset()
    state.event.processedAt = new Date()
    await retryOutboxJob(`outbox-${eventId}-dispatch-0`)
    expect(state.event.attempts).toBe(1)
    expect(state.event.jobGeneration).toBe(1)
    expect(state.event.processedAt).toBeNull()
    state.event.processedAt = new Date()
    await retryOutboxJob(`outbox-${eventId}-dispatch-0`)
    expect(state.event.attempts).toBe(1)
    expect(state.event.jobGeneration).toBe(1)
    expect(state.event.processedAt).not.toBeNull()
  })
})
