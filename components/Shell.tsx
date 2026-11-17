import Link from 'next/link';
import Image from 'next/image';

const telegramUrl = 'https://t.me/prvodo';
const maxUrl = 'https://max.ru/join/RlWmJZNJ0D2nzGDatRQMEMj9NQVpqPb1RMoDhCqFz_M';

export function Header({current,hideName=false,hideCurrent=false}:{current?:string;hideName?:boolean;hideCurrent?:boolean}) {
  return <header className={`header wrap ${hideName?'header-minimal':''}`}>
    {!hideName&&<Link href="/about/" className="wordmark">Сергей<br/>Водопетов<span className="name-dot">.</span></Link>}
    <nav aria-label="Основная навигация">
      {current?<><Link href="/">Главная <span aria-hidden className="arrow"></span></Link>{!hideCurrent&&<span className="nav-current">{current}</span>}</>:<a href="#directions">Четыре направления <span aria-hidden>↓</span></a>}
    </nav>
  </header>;
}

export function Footer({email='serg@vodopetov.ru'}:{email?:string}) {
  return <footer className="footer wrap" id="contacts">
    <div className="footer-top">
      <Link href="/about/">О Сергее <span aria-hidden className="arrow"></span></Link>
      <div className="footer-contact">
        <span className="eyebrow">Контакты</span>
        <div className="footer-socials" aria-label="Каналы связи">
          <a href={telegramUrl} target="_blank" rel="noopener noreferrer" aria-label="Телеграм-канал" title="Telegram">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor"><path d="M21.5 3.3a1.8 1.8 0 0 0-1.8-.3L3.3 9.2a1.8 1.8 0 0 0 .2 3.5l4.2 1.3 1.6 5.3a1.6 1.6 0 0 0 2.7.7l2.8-2.8 4.3 3.1a1.8 1.8 0 0 0 2.8-1.1l2.4-14.2a1.8 1.8 0 0 0-.8-1.7ZM9.6 13.3l9.8-7.1-7.8 9.2-.6 2.3-1.4-4.4Z"/></svg>
            <span className="footer-social-label">Telegram</span>
          </a>
          <a href={maxUrl} target="_blank" rel="noopener noreferrer" aria-label="Канал в MAX" title="MAX">
            <img className="max-icon" src="https://max.ru/s/img/big-logo.png" alt="" width={25} height={25} />
            <span className="footer-social-label">MAX</span>
          </a>
        </div>
        <a className="email" href={'mailto:'+email}>{email} <span aria-hidden className="arrow"></span></a>
        <div className="footer-projects" aria-label="Мои проекты">
          <a href="https://solo-pr.ru" target="_blank" rel="noopener noreferrer" className="footer-project" aria-label="Соло-Пиар — перейти на сайт solo-pr.ru" title="Соло-Пиар">
            <Image src="/assets/projects/solo-pr-mark.svg" alt="Знак Соло-Пиар" width={54} height={54}/>
            <span>Соло-Пиар</span>
          </a>
          <a href="https://raga.vodopetov.ru" target="_blank" rel="noopener noreferrer" className="footer-project" aria-label="RAGA — перейти на сайт raga.vodopetov.ru" title="RAGA">
            <Image src="/assets/projects/raga-frog.png" alt="Логотип RAGA" width={62} height={54}/>
            <span>RAGA</span>
          </a>
        </div>
      </div>
    </div>
    <div className="footer-bottom">
      <span>© {new Date().getFullYear()} Сергей Водопетов</span>
      <div><Link href="/privacy/">Персональные данные</Link><Link href="/cookies/">Cookies</Link></div>
      <span>Медиаменеджер. Учёный. Предприниматель.</span>
    </div>
  </footer>;
}

export function Rich({html,className=''}:{html:string}) {
  return <div className={'rich '+className} dangerouslySetInnerHTML={{__html:html}}/>;
}
