import './app-decoration.css'
export function AppDecoration({variant,className=''}:{variant:'mathematical'|'paper';className?:string}){return <img className={`app-decoration app-decoration-${variant} ${className}`} src="/illustrations/openplex-orbital-study.png" alt="" aria-hidden="true" loading="lazy"/>}
