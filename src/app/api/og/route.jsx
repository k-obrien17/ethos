import { ImageResponse } from '@vercel/og'

export const runtime = 'edge'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const title = searchParams.get('title') ?? 'Credo'
  const subtitle = searchParams.get('subtitle') ?? ''
  const detail = searchParams.get('detail') ?? ''

  return new ImageResponse(
    (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px',
        width: '100%',
        height: '100%',
        backgroundColor: '#faf9f7',
        fontFamily: 'Inter, sans-serif',
      }}>
        {type && (
          <div style={{
            fontSize: 20,
            color: '#78716c',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: '16px',
          }}>
            {type === 'question' ? 'Question' : type === 'answer' ? 'Expert Answer' : 'Expert Profile'}
          </div>
        )}
        <div style={{
          fontSize: 48,
          fontWeight: 700,
          color: '#1c1917',
          lineHeight: 1.2,
          maxWidth: '900px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {title.slice(0, 120)}
        </div>
        {subtitle && (
          <div style={{
            fontSize: 24,
            color: '#57534e',
            marginTop: '16px',
          }}>
            {subtitle.slice(0, 100)}
          </div>
        )}
        {detail && (
          <div style={{
            fontSize: 18,
            color: '#a8a29e',
            marginTop: '12px',
          }}>
            {detail.slice(0, 80)}
          </div>
        )}
        <div style={{
          position: 'absolute',
          bottom: '40px',
          right: '60px',
          fontSize: 28,
          fontWeight: 700,
          color: '#d6d3d1',
        }}>
          Credo
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
