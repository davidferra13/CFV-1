export default function Custom500() {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>500</h1>
        <p style={{ color: '#666' }}>A server-side error occurred.</p>
      </div>
    </div>
  )
}

export async function getStaticProps() {
  return { props: {} }
}
