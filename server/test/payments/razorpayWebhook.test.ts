import { afterEach, describe, expect, it, jest } from '@jest/globals'
import { createHmac } from 'node:crypto'

const seenEvents = new Set<string>()
const mockWebhookCreate = jest.fn<(...args: any[]) => Promise<any>>()
const mockWebhookUpdate = jest.fn<(...args: any[]) => Promise<any>>()
const mockTransaction = jest.fn<(...args: any[]) => Promise<any>>()
const mockOrderFindFirst = jest.fn<(...args: any[]) => Promise<any>>()
const mockOrderUpdateMany = jest.fn<(...args: any[]) => Promise<any>>()
const mockOutboxCreateMany = jest.fn<(...args: any[]) => Promise<any>>()
const mockOutboxUpsert = jest.fn<(...args: any[]) => Promise<any>>()
const mockPaymentFetch = jest.fn<(...args: any[]) => Promise<any>>()
const mockRefundAttemptFindUnique = jest.fn<(...args: any[]) => Promise<any>>()
const mockRefundAttemptFindFirst = jest.fn<(...args: any[]) => Promise<any>>()
const mockRefundAttemptUpdateMany = jest.fn<(...args: any[]) => Promise<any>>()

const mockTx = {
  webhookEvent: { create: mockWebhookCreate, update: mockWebhookUpdate },
  order: { findFirst: mockOrderFindFirst, updateMany: mockOrderUpdateMany },
  refundAttempt: { findUnique: mockRefundAttemptFindUnique, findFirst: mockRefundAttemptFindFirst, updateMany: mockRefundAttemptUpdateMany },
  outboxEvent: { createMany: mockOutboxCreateMany, upsert: mockOutboxUpsert },
}

jest.mock('../../config/prisma.js', () => ({ prisma: { $transaction: mockTransaction } }))
jest.mock('../../config/razorpay.js', () => ({ razorpay: { payments: { fetch: mockPaymentFetch } } }))

import { handleRazorpayWebhook } from '../../controllers/razorpayWebhookController.js'
import { verifyWebhookSignature } from '../../services/paymentService.js'

const secret = 'webhook-secret-for-tests'
const signed = (body: Buffer) => createHmac('sha256', secret).update(body).digest('hex')
const invoke = async (body: Buffer, signature: string, eventId = 'evt_1') => {
  let statusCode = 0
  let responseBody: any
  const req = { body, header: (name: string) => ({ 'x-razorpay-signature': signature, 'x-razorpay-event-id': eventId }[name.toLowerCase()]) } as any
  const res = { status(code: number) { statusCode = code; return this }, json(value: any) { responseBody = value; return this } } as any
  await handleRazorpayWebhook(req, res)
  return { statusCode, responseBody }
}

describe('Razorpay webhook verification, validation and deduplication', () => {
  afterEach(() => {
    jest.clearAllMocks()
    seenEvents.clear()
    process.env.RAZORPAY_WEBHOOK_SECRET = secret
    process.env.RAZORPAY_KEY_SECRET = 'distinct-api-secret'
    mockTransaction.mockImplementation(async (operation: (tx: typeof mockTx) => Promise<any>) => {
      const before = new Set(seenEvents)
      try { return await operation(mockTx) }
      catch (error) { seenEvents.clear(); before.forEach((event) => seenEvents.add(event)); throw error }
    })
    mockWebhookCreate.mockImplementation(async ({ data }: any) => {
      if (seenEvents.has(data.eventId)) throw { code: 'P2002', meta: { target: ['eventId'] } }
      seenEvents.add(data.eventId)
      return data
    })
    mockWebhookUpdate.mockResolvedValue({})
    mockOrderFindFirst.mockResolvedValue(null)
    mockOrderUpdateMany.mockResolvedValue({ count: 1 })
    mockOutboxCreateMany.mockResolvedValue({ count: 2 })
    mockOutboxUpsert.mockResolvedValue({})
    mockRefundAttemptFindUnique.mockResolvedValue(null)
    mockRefundAttemptFindFirst.mockResolvedValue(null)
    mockRefundAttemptUpdateMany.mockResolvedValue({ count: 1 })
    mockPaymentFetch.mockReset()
  })

  it('verifies the signature against the original bytes before parsing', async () => {
    const body = Buffer.from('{ "event" : "payment.authorized" }')
    expect(verifyWebhookSignature(body, signed(body), secret)).toBe(true)
    expect(verifyWebhookSignature(Buffer.from('{"event":"payment.authorized"}'), signed(body), secret)).toBe(false)
    expect((await invoke(body, '0'.repeat(64))).statusCode).toBe(400)
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('rejects malformed JSON and missing event IDs', async () => {
    const malformed = Buffer.from('{not-json')
    expect((await invoke(malformed, signed(malformed))).statusCode).toBe(400)
    const valid = Buffer.from('{"event":"payment.authorized"}')
    expect((await invoke(valid, signed(valid), '')).statusCode).toBe(400)
    expect(mockWebhookCreate).not.toHaveBeenCalled()
  })

  it('acknowledges an already-persisted duplicate event', async () => {
    const body = Buffer.from('{"event":"payment.authorized"}')
    const first = await invoke(body, signed(body), 'evt_duplicate')
    const second = await invoke(body, signed(body), 'evt_duplicate')
    expect(first.statusCode).toBe(200)
    expect(second).toEqual({ statusCode: 200, responseBody: { received: true, duplicate: true } })
    expect(mockWebhookUpdate).toHaveBeenCalledTimes(1)
  })

  it('deduplicates simultaneous deliveries by database uniqueness', async () => {
    const body = Buffer.from('{"event":"payment.authorized"}')
    const results = await Promise.all([invoke(body, signed(body), 'evt_concurrent'), invoke(body, signed(body), 'evt_concurrent')])
    expect(results.map((result) => result.statusCode).sort()).toEqual([200, 200])
    expect(results.some((result) => result.responseBody.duplicate)).toBe(true)
    expect(mockWebhookUpdate).toHaveBeenCalledTimes(1)
  })

  it('records captured payments from the authenticated event payload without another SDK fetch', async () => {
    mockOrderFindFirst.mockResolvedValue({ id: 'local-order-1', status: 'Placed', paymentMethod: 'card', isPaid: false, total: 265, razorpayOrderId: 'order_1' })
    const body = Buffer.from(JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: {
      id: 'pay_1', order_id: 'order_1', amount: 26500, currency: 'INR', status: 'captured',
    } } } }))
    expect((await invoke(body, signed(body), 'evt_capture')).statusCode).toBe(200)
    expect(mockOrderUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'local-order-1', isPaid: false, status: 'Placed' }),
      data: expect.objectContaining({ isPaid: true, razorpayPaymentId: 'pay_1' }),
    }))
    expect(mockOutboxCreateMany).toHaveBeenCalledTimes(1)
    expect(mockPaymentFetch).not.toHaveBeenCalled()
  })

  it('does not persist malformed supported payment events', async () => {
    const body = Buffer.from('{"event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_1"}}}}')
    expect((await invoke(body, signed(body), 'evt_malformed')).statusCode).toBe(400)
    expect(seenEvents.has('evt_malformed')).toBe(false)
  })

  it('acknowledges unknown valid events after durable receipt', async () => {
    const body = Buffer.from('{"event":"payment.authorized","payload":{}}')
    expect((await invoke(body, signed(body), 'evt_unknown')).statusCode).toBe(200)
    expect(seenEvents.has('evt_unknown')).toBe(true)
    expect(mockOrderUpdateMany).not.toHaveBeenCalled()
  })

  it('records a valid failed payment but cannot downgrade an already paid order', async () => {
    mockOrderFindFirst.mockResolvedValue({ id: 'local-order-1', paymentMethod: 'card', total: 265 })
    const body = Buffer.from(JSON.stringify({ event: 'payment.failed', payload: { payment: { entity: {
      id: 'pay_failed', order_id: 'order_1', amount: 26500, currency: 'INR', status: 'failed',
    } } } }))
    expect((await invoke(body, signed(body), 'evt_failed')).statusCode).toBe(200)
    expect(mockOrderUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ isPaid: false, paymentStatus: 'pending' }),
      data: { paymentStatus: 'failed' },
    }))
  })

  it('marks the matching refund attempt processed and the order refunded', async () => {
    const attempt = { id: 'attempt-1', orderId: 'local-order-1', attemptNumber: 1, paymentId: 'pay_late', refundId: 'rf_1', amount: 26500, status: 'pending' }
    mockOrderFindFirst.mockResolvedValue({ id: 'local-order-1', paymentMethod: 'card', razorpayPaymentId: 'pay_late', refundAmount: 26500, refundAttempts: 1, refundStatus: 'pending' })
    mockRefundAttemptFindUnique.mockResolvedValue(attempt)
    const body = Buffer.from(JSON.stringify({ event: 'refund.processed', payload: { refund: { entity: {
      id: 'rf_1', payment_id: 'pay_late', amount: 26500, status: 'processed',
    } } } }))
    expect((await invoke(body, signed(body), 'evt_refund_processed')).statusCode).toBe(200)
    expect(mockRefundAttemptUpdateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'attempt-1', status: { not: 'processed' } }, data: expect.objectContaining({ status: 'processed' }) }))
    expect(mockOrderUpdateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ paymentStatus: 'refunded', refundStatus: 'processed' }) }))
  })

  it('records a failed refund as refund_failed and keeps the next retry queued', async () => {
    const attempt = { id: 'attempt-1', orderId: 'local-order-1', attemptNumber: 1, paymentId: 'pay_late', refundId: 'rf_1', amount: 26500, status: 'pending' }
    mockOrderFindFirst.mockResolvedValue({ id: 'local-order-1', paymentMethod: 'card', razorpayPaymentId: 'pay_late', refundAmount: 26500, refundAttempts: 1, refundStatus: 'pending' })
    mockRefundAttemptFindUnique.mockResolvedValue(attempt)
    const body = Buffer.from(JSON.stringify({ event: 'refund.failed', payload: { refund: { entity: {
      id: 'rf_1', payment_id: 'pay_late', amount: 26500, status: 'failed',
    } } } }))

    expect((await invoke(body, signed(body), 'evt_refund_failed')).statusCode).toBe(200)
    expect(mockRefundAttemptUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'attempt-1', status: 'pending' },
      data: expect.objectContaining({ status: 'failed', refundId: 'rf_1' }),
    }))
    expect(mockOrderUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'local-order-1', refundAttempts: 1 }),
      data: expect.objectContaining({ refundStatus: 'failed', paymentStatus: 'refund_failed' }),
    }))
    expect(mockOutboxUpsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { dedupeKey: 'refund:local-order-1:attempt:2:retry' },
      create: expect.objectContaining({ payload: { orderId: 'local-order-1', attemptNumber: 2 } }),
    }))
    expect(seenEvents.has('evt_refund_failed')).toBe(true)
  })

  it('does not let a stale refund failure alter the current attempt or queue another retry', async () => {
    const oldAttempt = { id: 'attempt-1', orderId: 'local-order-1', attemptNumber: 1, paymentId: 'pay_late', refundId: 'rf_old', amount: 26500, status: 'pending' }
    mockOrderFindFirst.mockResolvedValue({ id: 'local-order-1', paymentMethod: 'card', razorpayPaymentId: 'pay_late', refundAmount: 26500, refundAttempts: 2, refundStatus: 'pending' })
    mockRefundAttemptFindUnique.mockResolvedValue(oldAttempt)
    const body = Buffer.from(JSON.stringify({ event: 'refund.failed', payload: { refund: { entity: {
      id: 'rf_old', payment_id: 'pay_late', amount: 26500, status: 'failed',
    } } } }))
    expect((await invoke(body, signed(body), 'evt_refund_stale')).statusCode).toBe(200)
    expect(mockRefundAttemptUpdateMany).toHaveBeenCalledTimes(1)
    expect(mockOrderUpdateMany).not.toHaveBeenCalled()
    expect(mockOutboxUpsert).not.toHaveBeenCalled()
  })

  it('does not acknowledge a webhook when its database transaction fails', async () => {
    mockWebhookUpdate.mockRejectedValueOnce(new Error('database unavailable'))
    const body = Buffer.from('{"event":"payment.authorized"}')
    await expect(invoke(body, signed(body), 'evt_db_error')).rejects.toThrow('database unavailable')
    expect(seenEvents.has('evt_db_error')).toBe(false)
  })
})
