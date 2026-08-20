type Locale = 'es' | 'en'

export function PublicLanguageSwitch({ locale, englishPath, spanishPath = '/' }: { locale: Locale; englishPath: string; spanishPath?: string }) {
  return (
    <div className="public-language-switch" aria-label="Selector de idioma">
      <a className={locale === 'es' ? 'active' : ''} href={spanishPath}>ES</a>
      <span>/</span>
      <a className={locale === 'en' ? 'active' : ''} href={englishPath}>EN</a>
    </div>
  )
}

export function PublicNav({ locale = 'es', englishPath = '/', spanishPath = '/' }: { locale?: Locale; englishPath?: string; spanishPath?: string }) {
  const english = locale === 'en'
  return (
    <nav className="public-nav">
      <a className="public-brand" href={english ? '/en' : '/'}>Orbiqen</a>
      <div>
        <a href={english ? '/en/pricing' : '/precios'}>{english ? 'Pricing' : 'Precios'}</a>
        <a href={english ? '/en/docs' : '/docs'}>{english ? 'Documentation' : 'Documentación'}</a>
        <PublicLanguageSwitch locale={locale} englishPath={englishPath} spanishPath={spanishPath} />
        <a className="public-nav-cta" href="/login">{english ? 'Sign in' : 'Ingresar'}</a>
      </div>
    </nav>
  )
}
