    function createButterflySVG(color1, color2) {
      return `
        <svg viewBox="0 0 36 30" width="36" height="30">
          <path class="wing-left" d="M18,15 C10,4 2,6 2,14 C2,21 12,24 18,16 Z" fill="${color1}" stroke="#211409" stroke-width="1.2"/>
          <path class="wing-left" d="M18,15 C12,8 5,9 6,15" fill="none" stroke="#211409" stroke-width="0.8"/>
          <path class="wing-right" d="M18,15 C26,4 34,6 34,14 C34,21 24,24 18,16 Z" fill="${color1}" stroke="#211409" stroke-width="1.2"/>
          <path class="wing-right" d="M18,15 C24,8 31,9 30,15" fill="none" stroke="#211409" stroke-width="0.8"/>
          <ellipse cx="18" cy="15" rx="2" ry="7.5" fill="#1f140a"/>
          <line x1="17" y1="8" x2="14" y2="4" stroke="#1f140a" stroke-width="0.9"/>
          <line x1="19" y1="8" x2="22" y2="4" stroke="#1f140a" stroke-width="0.9"/>
        </svg>
      `;
    }

    function createBeeSVG() {
      return `
        <svg viewBox="0 0 32 26" width="32" height="26">
          <ellipse class="wing-left" cx="12" cy="7" rx="8" ry="4" fill="rgba(255,255,255,0.75)" stroke="#665544" stroke-width="0.8" transform="rotate(-30 12 7)"/>
          <ellipse class="wing-right" cx="20" cy="7" rx="8" ry="4" fill="rgba(255,255,255,0.75)" stroke="#665544" stroke-width="0.8" transform="rotate(30 20 7)"/>
          <ellipse cx="16" cy="15" rx="6.5" ry="9" fill="#f4b223" stroke="#2b1c06" stroke-width="1.2"/>
          <path d="M10,13 Q16,15 22,13 M10,17 Q16,19 22,17" stroke="#2b1c06" stroke-width="2.2" fill="none"/>
          <circle cx="16" cy="7.5" r="3.8" fill="#2b1c06"/>
          <circle cx="14.8" cy="7" r="1" fill="#fff"/>
          <line x1="15" y1="5" x2="12" y2="2" stroke="#2b1c06" stroke-width="0.8"/>
          <line x1="17" y1="5" x2="20" y2="2" stroke="#2b1c06" stroke-width="0.8"/>
        </svg>
      `;
    }

    function createLadybugSVG() {
      return `
        <svg viewBox="0 0 28 26" width="28" height="26">
          <ellipse class="wing-left" cx="8" cy="8" rx="7" ry="3.5" fill="rgba(255,255,255,0.7)" stroke="#333" stroke-width="0.7" transform="rotate(-40 8 8)"/>
          <ellipse class="wing-right" cx="20" cy="8" rx="7" ry="3.5" fill="rgba(255,255,255,0.7)" stroke="#333" stroke-width="0.7" transform="rotate(40 20 8)"/>
          <circle cx="14" cy="14" r="9" fill="#e63946" stroke="#240004" stroke-width="1.2"/>
          <line x1="14" y1="5" x2="14" y2="23" stroke="#240004" stroke-width="1.2"/>
          <circle cx="9" cy="12" r="1.6" fill="#1a0003"/>
          <circle cx="19" cy="12" r="1.6" fill="#1a0003"/>
          <circle cx="10" cy="17" r="1.6" fill="#1a0003"/>
          <circle cx="18" cy="17" r="1.6" fill="#1a0003"/>
          <circle cx="14" cy="5.5" r="3.2" fill="#1a0003"/>
          <circle cx="12.5" cy="5" r="0.8" fill="#fff"/>
          <circle cx="15.5" cy="5" r="0.8" fill="#fff"/>
        </svg>
      `;
    }

