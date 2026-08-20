import { ImageResponse } from 'next/og'

export const alt = 'Orbiqen AI API Gateway'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '72px', color: '#ffffff', background: 'linear-gradient(135deg, #071014 0%, #10241e 58%, #3b241a 100%)' }}>
      <div style={{ display: 'flex', color: '#ffb06d', fontSize: 26, fontWeight: 800, letterSpacing: 4 }}>ORBIQEN</div>
      <div style={{ display: 'flex', marginTop: 28, maxWidth: 920, fontSize: 68, lineHeight: 1.05, fontWeight: 800 }}>Una API para GPT, Claude y tus clientes.</div>
      <div style={{ display: 'flex', marginTop: 28, color: '#c3d0cb', fontSize: 28 }}>Gateway compatible con OpenAI · saldo prepago · usage por cliente</div>
    </div>,
    { ...size },
  )
}
