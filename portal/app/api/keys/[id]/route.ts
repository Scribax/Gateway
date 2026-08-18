import { BackendError, errorResponse, newApiFetch, type NewApiEnvelope } from '@/lib/new-api'

function parseId(value: string): number {
  const id = Number(value)
  if (!Number.isInteger(id) || id <= 0) throw new BackendError('Clave inválida.', 400)
  return id
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: rawId } = await context.params
    const id = parseId(rawId)
    const body = await newApiFetch<NewApiEnvelope<unknown>>(`/api/token/${id}/`, { method: 'DELETE' })
    if (!body.success) throw new BackendError(body.message || 'No se pudo eliminar la clave.', 400)
    return Response.json({ success: true })
  } catch (error) {
    return errorResponse(error)
  }
}
