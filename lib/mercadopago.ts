import { MercadoPagoConfig, PreApproval, Payment } from 'mercadopago'

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!
})

export const preApproval = new PreApproval(client)
export const payment = new Payment(client)
export { client }
