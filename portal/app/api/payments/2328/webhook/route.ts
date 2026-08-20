import { errorResponse } from '@/lib/new-api'
import { process2328Webhook } from '@/lib/2328'

export async function GET() {
  return Response.json({ success: true })
}

export async function POST(request: Request) {
  try {
    const result = await process2328Webhook(request)
    return Response.json({ success: true, data: result })
  } catch (error) {
    return errorResponse(error)
  }
}
