import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { processEmailJob } from '../../bullmq/Emailjob.js'

describe('email jobs', () => {
  const deliver = jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue(undefined)
  beforeEach(() => { jest.clearAllMocks() })

  it('sends a low stock alert to configured admins and escapes product data', async () => {
    process.env.ADMIN_EMAILS = 'admin@example.test'
    const result = await processEmailJob({ name: 'low-stock-email', data: { productName: '<Apples>', sku: 'A&B', stockQuantity: 2 } }, deliver)

    expect(result).toEqual({ success: true })
    expect(deliver).toHaveBeenCalledWith(expect.objectContaining({
      to: ['admin@example.test'],
      body: expect.stringContaining('&lt;Apples&gt;'),
    }))
    expect((deliver.mock.calls[0][0] as any).body).toContain('A&amp;B')
  })

  it('rejects invalid recipients without sending', async () => {
    await expect(processEmailJob({ name: 'send-email', data: { to: 'bad-address', subject: 'Hello', html: '<p>Hi</p>' } }, deliver))
      .rejects.toThrow('Email job has invalid recipients')
    expect(deliver).not.toHaveBeenCalled()
  })

  it('skips low stock alerts when no valid admin email is configured', async () => {
    process.env.ADMIN_EMAILS = 'not-an-email'
    await expect(processEmailJob({ name: 'low-stock-email', data: { productName: 'Apples', sku: 'A1', stockQuantity: 0 } }, deliver))
      .resolves.toEqual({ skipped: true, reason: 'No valid admin emails configured' })
    expect(deliver).not.toHaveBeenCalled()
  })

  it('sends a personalized promotional email to each customer in groups of at most ten', async () => {
    const customers = Array.from({ length: 11 }, (_, index) => ({
      name: `Customer ${index + 1}`,
      email: `customer${index + 1}@example.test`,
    }))
    const deals = [
      { name: '<Fresh apples>', price: 2.5, originalPrice: 3, image: 'https://example.test/apples.png' },
      { name: 'Bananas', price: 1.25 },
    ]

    const result = await processEmailJob({ name: 'promotional-email', data: { customers, deals } }, deliver)

    expect(result).toEqual({ success: true, sent: 11 })
    expect(deliver).toHaveBeenCalledTimes(11)
    expect(deliver).toHaveBeenNthCalledWith(1, expect.objectContaining({
      to: 'customer1@example.test',
      subject: 'Fresh Picks Just For You!',
      body: expect.stringContaining('Hi <strong>Customer 1</strong>'),
    }))
    expect((deliver.mock.calls[0][0] as any).body).toContain('&lt;Fresh apples&gt;')
    expect((deliver.mock.calls[10][0] as any).body).toContain('Hi <strong>Customer 11</strong>')
  })

  it('rejects promotional jobs with invalid customer or deal data', async () => {
    await expect(processEmailJob({
      name: 'promotional-email',
      data: { customers: [{ name: 'No email', email: 'invalid' }], deals: [{ name: 'Apples', price: 1 }] },
    }, deliver)).rejects.toThrow('Promotional email job has invalid customers')

    await expect(processEmailJob({
      name: 'promotional-email',
      data: { customers: [{ name: 'A Customer', email: 'customer@example.test' }], deals: [{ name: 'Apples', price: -1 }] },
    }, deliver)).rejects.toThrow('Promotional email job has invalid deals')
    expect(deliver).not.toHaveBeenCalled()
  })
})
