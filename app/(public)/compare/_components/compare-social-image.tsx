type CompareSocialImageProps = {
  accentLabel: string
  chips: string[]
  description: string
  eyebrow: string
  title: string
}

export function CompareSocialImage({
  accentLabel,
  chips,
  description,
  eyebrow,
  title,
}: CompareSocialImageProps) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        overflow: 'hidden',
        background:
          'radial-gradient(circle at 18% 18%, rgba(232, 143, 71, 0.24), transparent 32%), linear-gradient(135deg, #14110f 0%, #221b18 52%, #120f0d 100%)',
        color: '#fafaf9',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 82% 18%, rgba(245, 158, 11, 0.14), transparent 24%), radial-gradient(circle at 88% 82%, rgba(217, 119, 6, 0.12), transparent 26%)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '8px',
          background: 'linear-gradient(90deg, #f6b26b 0%, #e88f47 48%, #c96c2a 100%)',
        }}
      />

      <div
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'stretch',
          padding: '54px 56px 46px',
          gap: '28px',
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '20px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #f6b26b 0%, #d47530 100%)',
                  color: '#ffffff',
                  fontSize: '18px',
                  fontWeight: 700,
                }}
              >
                CF
              </div>
              <div
                style={{
                  display: 'flex',
                  padding: '7px 12px',
                  borderRadius: '999px',
                  border: '1px solid rgba(245, 158, 11, 0.24)',
                  background: 'rgba(251, 191, 36, 0.08)',
                  color: '#fdba74',
                  fontSize: '14px',
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                {eyebrow}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div
                style={{
                  display: 'flex',
                  maxWidth: '620px',
                  fontSize: '68px',
                  lineHeight: 1,
                  fontWeight: 800,
                  letterSpacing: '-0.04em',
                }}
              >
                {title}
              </div>
              <div
                style={{
                  display: 'flex',
                  maxWidth: '600px',
                  fontSize: '24px',
                  lineHeight: 1.4,
                  color: '#d6d3d1',
                  fontWeight: 500,
                }}
              >
                {description}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', maxWidth: '620px' }}>
            {chips.slice(0, 5).map((chip) => (
              <div
                key={chip}
                style={{
                  display: 'flex',
                  padding: '10px 16px',
                  borderRadius: '999px',
                  background: 'rgba(28, 25, 23, 0.78)',
                  border: '1px solid rgba(120, 113, 108, 0.45)',
                  color: '#f5f5f4',
                  fontSize: '16px',
                  fontWeight: 600,
                }}
              >
                {chip}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            width: '356px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              padding: '24px',
              borderRadius: '30px',
              background: 'rgba(28, 25, 23, 0.8)',
              border: '1px solid rgba(120, 113, 108, 0.32)',
              boxShadow: '0 18px 40px rgba(0, 0, 0, 0.24)',
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: '14px',
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#f6b26b',
              }}
            >
              {accentLabel}
            </div>

            {chips.slice(0, 3).map((chip, index) => (
              <div
                key={`${chip}-${index}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '14px',
                  padding: '16px',
                  borderRadius: '22px',
                  background:
                    index === 0
                      ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.1))'
                      : 'rgba(41, 37, 36, 0.92)',
                  border: '1px solid rgba(120, 113, 108, 0.32)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      fontSize: '20px',
                      fontWeight: 700,
                      color: '#fafaf9',
                      lineHeight: 1.2,
                    }}
                  >
                    {chip}
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '52px',
                    height: '52px',
                    borderRadius: '18px',
                    background:
                      index === 0
                        ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.88), rgba(217, 119, 6, 0.72))'
                        : 'linear-gradient(135deg, rgba(68, 64, 60, 0.96), rgba(41, 37, 36, 0.96))',
                    color: '#fff',
                    fontSize: '20px',
                    fontWeight: 700,
                  }}
                >
                  {index + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
