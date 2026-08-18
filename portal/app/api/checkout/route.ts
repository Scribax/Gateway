export async function POST() {
  return Response.json(
    { success: false, message: 'Los pagos en línea todavía no están habilitados.' },
    { status: 503 },
  )
}
