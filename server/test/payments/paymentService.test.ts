import { afterEach, describe, expect, it, jest } from '@jest/globals'
import { createHmac } from 'node:crypto'

const mockState: { order: any } = { order: null }
const mockOutboxCreateMany = jest.fn<(...args: any[]) => Promise<any>>()
const mockOutboxUpsert = jest.fn<(...args: any[]) => Promise<any>>()
const mockRefundAttemptUpsert = jest.fn<(...args: any[]) => Promise<any>>()
const mockOrderFindFirst = jest.fn<(...args: any[]) => Promise<any>>()
const mockOrderFindUnique = jest.fn<(...args: any[]) => Promise<any>>()
const mockOrderUpdateMany = jest.fn<(...args: any[]) => Promise<any>>()
const mockTransaction = jest.fn<(...args: any[]) => Promise<any>>()
const mockPaymentFetch = jest.fn<(...args: any[]) => Promise<any>>()

const mockTx = {
  order: { findFirst: mockOrderFindFirst, findUnique: mockOrderFindUnique, updateMany: mockOrderUpdateMany },
  outboxEvent: { createMany: mockOutboxCreateMany, upsert: mockOutboxUpsert },
  refundAttempt: { upsert: mockRefundAttemptUpsert },
}

jest.mock('../../config/prisma.js', () => ({ prisma: { $transaction: mockTransaction, order: { findFirst: mockOrderFindFirst } } }))
jest.mock('../../config/razorpay.js', () => ({ razorpay: { payments: { fetch: mockPaymentFetch } } }))

import { recordGatewayPayment, verifyAndRecordPayment } from '../../services/paymentService.js'

const secret = 'test-secret-only'
const checkoutSignature = (orderId: string, paymentId: string) => createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex')

const resetOrder = (status = 'Placed') => {
  mockState.order = {
    id: 'local-order-1', userId: 'user-1', status, paymentMethod: 'card', isPaid: false,
    total: 265, razorpayOrderId: 'order_gateway_1', razorpayPaymentId: null,
    paymentStatus: 'pending', refundStatus: null, refundIdempotencyKey: null,
    refundRequestedAt: null, refundAmount: null, refundAttempts: 0,
  }
  process.env.RAZORPAY_KEY_SECRET = secret
  mockTransaction.mockImplementation(async (operation: (tx: typeof mockTx) => Promise<any>) => operation(mockTx))
  mockOrderFindFirst.mockImplementation(async ({ where }: any) =>
    mockState.order?.razorpayOrderId === where.razorpayOrderId && (!where.userId || mockState.order.userId === where.userId)
      ? mockState.order : null)
  mockPaymentFetch.mockImplementation(async (paymentId: string) => ({ id: paymentId, order_id: 'order_gateway_1', amount: 26500, currency: 'INR', status: 'captured' }))
  mockOrderFindUnique.mockImplementation(async () => mockState.order)
  mockOrderUpdateMany.mockImplementation(async ({ where, data }: any) => {
    const order = mockState.order
    const matches = order && order.id === where.id && order.isPaid === where.isPaid && order.status === where.status &&
      order.paymentMethod === where.paymentMethod && (!where.razorpayOrderId || order.razorpayOrderId === where.razorpayOrderId) &&
      (!Object.hasOwn(where, 'razorpayPaymentId') || order.razorpayPaymentId === where.razorpayPaymentId) &&
      (!where.OR || where.OR.some((condition: any) => Object.entries(condition).every(([key, value]) => order[key] === value)))
    if (!matches) return { count: 0 }
    Object.assign(order, data)
    return { count: 1 }
  })
  mockOutboxCreateMany.mockResolvedValue({ count: 2 })
  mockOutboxUpsert.mockResolvedValue({})
  mockRefundAttemptUpsert.mockResolvedValue({})
}

describe('payment verification state', () => {
  afterEach(() => jest.clearAllMocks())

  it('fetches a captured payment and writes processing outbox events atomically', async () => {
    resetOrder()
    const result = await verifyAndRecordPayment({ userId: 'user-1', orderId: 'order_gateway_1', paymentId: 'pay_1', signature: checkoutSignature('order_gateway_1', 'pay_1') })
    expect(result).toEqual({ kind: 'paid', orderId: 'local-order-1' })
    expect(mockState.order).toMatchObject({ isPaid: true, paymentStatus: 'paid', razorpayPaymentId: 'pay_1' })
    expect(mockOutboxCreateMany).toHaveBeenCalledTimes(1)
    expect(mockPaymentFetch).toHaveBeenCalledWith('pay_1')
  })

  it('rejects an invalid checkout signature without updating the order', async () => {
    resetOrder()
    const result = await verifyAndRecordPayment({ userId: 'user-1', orderId: 'order_gateway_1', paymentId: 'pay_1', signature: 'a'.repeat(64) })
    expect(result).toEqual({ kind: 'invalid-signature' })
    expect(mockOrderUpdateMany).not.toHaveBeenCalled()
  })

  it('returns success for repeated verification of the same payment', async () => {
    resetOrder()
    const input = { userId: 'user-1', orderId: 'order_gateway_1', paymentId: 'pay_1', signature: checkoutSignature('order_gateway_1', 'pay_1') }
    await verifyAndRecordPayment(input)
    const second = await verifyAndRecordPayment(input)
    expect(second).toEqual({ kind: 'already-paid', orderId: 'local-order-1' })
    expect(mockOutboxCreateMany).toHaveBeenCalledTimes(1)
  })

  it('does not replace a successful payment with a different payment ID', async () => {
    resetOrder()
    mockState.order.isPaid = true
    mockState.order.paymentStatus = 'paid'
    mockState.order.razorpayPaymentId = 'pay_original'
    const result = await recordGatewayPayment({ razorpayOrderId: 'order_gateway_1', paymentId: 'pay_other', amount: 26500, currency: 'INR' })
    expect(result).toEqual({ kind: 'payment-conflict' })
    expect(mockState.order.razorpayPaymentId).toBe('pay_original')
  })

  it('records a signed late payment for refund without reactivating an expired order', async () => {
    resetOrder('Cancelled')
    const result = await verifyAndRecordPayment({ userId: 'user-1', orderId: 'order_gateway_1', paymentId: 'pay_late', signature: checkoutSignature('order_gateway_1', 'pay_late') })
    expect(result).toEqual({ kind: 'expired', orderId: 'local-order-1', refundStatus: 'pending' })
    expect(mockState.order).toMatchObject({ status: 'Cancelled', isPaid: false, paymentStatus: 'refund_pending', refundStatus: 'pending', razorpayPaymentId: 'pay_late', refundAmount: 26500, refundAttempts: 1, refundIdempotencyKey: 'tn-refund-local-order-1-1' })
    expect(mockOutboxUpsert).toHaveBeenCalledTimes(1)
    expect(mockRefundAttemptUpsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { orderId_attemptNumber: { orderId: 'local-order-1', attemptNumber: 1 } },
      create: expect.objectContaining({ paymentId: 'pay_late', idempotencyKey: 'tn-refund-local-order-1-1', amount: 26500 }),
    }))
    expect(mockOutboxCreateMany).not.toHaveBeenCalled()
  })

  it.each(['authorized', 'failed', 'refunded'])('rejects a payment in %s state', async (status) => {
    resetOrder()
    mockPaymentFetch.mockResolvedValue({ id: 'pay_1', order_id: 'order_gateway_1', amount: 26500, currency: 'INR', status })
    const result = await verifyAndRecordPayment({ userId: 'user-1', orderId: 'order_gateway_1', paymentId: 'pay_1', signature: checkoutSignature('order_gateway_1', 'pay_1') })
    expect(result).toEqual({ kind: 'invalid-payment-details' })
    expect(mockOrderUpdateMany).not.toHaveBeenCalled()
  })

  it.each([
    [{ id: 'pay_1', order_id: 'order_other', amount: 26500, currency: 'INR', status: 'captured' }, 'wrong order ID'],
    [{ id: 'pay_other', order_id: 'order_gateway_1', amount: 26500, currency: 'INR', status: 'captured' }, 'wrong payment ID'],
    [{ id: 'pay_1', order_id: 'order_gateway_1', amount: 26501, currency: 'INR', status: 'captured' }, 'wrong amount'],
    [{ id: 'pay_1', order_id: 'order_gateway_1', amount: 26500, currency: 'USD', status: 'captured' }, 'wrong currency'],
  ])('rejects fetched payment with %s', async (payment, _description) => {
    resetOrder()
    mockPaymentFetch.mockResolvedValue(payment)
    const result = await verifyAndRecordPayment({ userId: 'user-1', orderId: 'order_gateway_1', paymentId: 'pay_1', signature: checkoutSignature('order_gateway_1', 'pay_1') })
    expect(result).toEqual({ kind: 'invalid-payment-details' })
    expect(mockOrderUpdateMany).not.toHaveBeenCalled()
  })

  it('returns a gateway error distinctly when the payment fetch fails', async () => {
    resetOrder()
    mockPaymentFetch.mockRejectedValue(new Error('temporary Razorpay outage'))
    const result = await verifyAndRecordPayment({ userId: 'user-1', orderId: 'order_gateway_1', paymentId: 'pay_1', signature: checkoutSignature('order_gateway_1', 'pay_1') })
    expect(result).toEqual({ kind: 'gateway-error' })
    expect(mockOrderUpdateMany).not.toHaveBeenCalled()
  })

  it('checks ownership before fetching the payment', async () => {
    resetOrder()
    const result = await verifyAndRecordPayment({ userId: 'other-user', orderId: 'order_gateway_1', paymentId: 'pay_1', signature: checkoutSignature('order_gateway_1', 'pay_1') })
    expect(result).toEqual({ kind: 'not-found' })
    expect(mockPaymentFetch).not.toHaveBeenCalled()
  })

  it('prevents concurrent late payments with different IDs from overwriting one another', async () => {
    resetOrder('Cancelled')
    const results = await Promise.all([
      recordGatewayPayment({ razorpayOrderId: 'order_gateway_1', paymentId: 'pay_a', amount: 26500, currency: 'INR' }),
      recordGatewayPayment({ razorpayOrderId: 'order_gateway_1', paymentId: 'pay_b', amount: 26500, currency: 'INR' }),
    ])
    expect(['pay_a', 'pay_b']).toContain(mockState.order.razorpayPaymentId)
    expect(results.filter((result) => result.kind === 'expired')).toHaveLength(1)
    expect(results.filter((result) => result.kind === 'payment-conflict')).toHaveLength(1)
    expect(mockOutboxUpsert).toHaveBeenCalledTimes(1)
  })

  it('does not create another attempt or refund outbox event for a repeated late payment', async () => {
    resetOrder('Cancelled')
    const input = { razorpayOrderId: 'order_gateway_1', paymentId: 'pay_late', amount: 26500, currency: 'INR' }
    const first = await recordGatewayPayment(input)
    const duplicate = await recordGatewayPayment(input)

    expect(first).toEqual({ kind: 'expired', orderId: 'local-order-1', refundStatus: 'pending' })
    expect(duplicate).toEqual({ kind: 'expired', orderId: 'local-order-1', refundStatus: 'pending' })
    expect(mockState.order).toMatchObject({ isPaid: false, status: 'Cancelled', razorpayPaymentId: 'pay_late', refundAttempts: 1 })
    expect(mockRefundAttemptUpsert).toHaveBeenCalledTimes(1)
    expect(mockOutboxUpsert).toHaveBeenCalledTimes(1)
  })

  it('rejects a different payment ID after a late payment has been recorded', async () => {
    resetOrder('Cancelled')
    await recordGatewayPayment({ razorpayOrderId: 'order_gateway_1', paymentId: 'pay_late', amount: 26500, currency: 'INR' })
    const conflict = await recordGatewayPayment({ razorpayOrderId: 'order_gateway_1', paymentId: 'pay_other', amount: 26500, currency: 'INR' })

    expect(conflict).toEqual({ kind: 'payment-conflict' })
    expect(mockState.order.razorpayPaymentId).toBe('pay_late')
    expect(mockState.order.refundAttempts).toBe(1)
    expect(mockRefundAttemptUpsert).toHaveBeenCalledTimes(1)
    expect(mockOutboxUpsert).toHaveBeenCalledTimes(1)
  })

  it('creates one attempt and outbox event for concurrent duplicate late notifications', async () => {
    resetOrder('Cancelled')
    const input = { razorpayOrderId: 'order_gateway_1', paymentId: 'pay_late', amount: 26500, currency: 'INR' }
    const results = await Promise.all([recordGatewayPayment(input), recordGatewayPayment(input)])

    expect(results).toEqual([
      { kind: 'expired', orderId: 'local-order-1', refundStatus: 'pending' },
      { kind: 'expired', orderId: 'local-order-1', refundStatus: 'pending' },
    ])
    expect(mockState.order).toMatchObject({ isPaid: false, status: 'Cancelled', razorpayPaymentId: 'pay_late', refundAttempts: 1 })
    expect(mockRefundAttemptUpsert).toHaveBeenCalledTimes(1)
    expect(mockOutboxUpsert).toHaveBeenCalledTimes(1)
  })
})
