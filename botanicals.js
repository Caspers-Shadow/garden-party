    let plantIdCounter = 0;
    let botanicalRandom = Math.random;
    function seededRandom(seed) {
      return function () {
        seed |= 0; seed = seed + 0x6D2B79F5 | 0;
        let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      };
    }
    let botanicalDetailCounter = 0;
    const botanicalInk = '#56513b';
    const botanicalPalettes = {
      rose: ['#f3d5ce', '#d98f91', '#9a4c59'],
      crimson: ['#e6aba0', '#b95c60', '#7c3b44'],
      ivory: ['#fff8e6', '#e6dec2', '#9c9274'],
      blue: ['#d5e2e6', '#849fbd', '#4e688f'],
      violet: ['#e8d4db', '#b995ae', '#785c80'],
      gold: ['#f5e5af', '#d6b762', '#94753d']
    };

    function botanicalPlate(name, draw) {
      const id = `specimen-${++plantIdCounter}`;
      const mirror = botanicalRandom() > .5 ? -1 : 1;
      const stretch = .93 + botanicalRandom() * .13;
      const washes = Object.entries(botanicalPalettes).map(([key, c]) => `
        <radialGradient id="${id}-${key}" cx="48%" cy="22%" r="82%">
          <stop stop-color="${c[0]}"/><stop offset=".57" stop-color="${c[1]}"/>
          <stop offset="1" stop-color="${c[2]}"/>
        </radialGradient>`).join('');
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 290" role="img" aria-label="${name}">
        <title>${name}</title><defs>${washes}
          <linearGradient id="${id}-leaf" x1="0" y1="0" x2="1" y2=".7">
            <stop stop-color="#a3a178"/><stop offset=".42" stop-color="#77805b"/>
            <stop offset="1" stop-color="#4e6245"/>
          </linearGradient>
        </defs><g stroke-linecap="round" stroke-linejoin="round">${`<g transform="translate(110,275) scale(${mirror},${stretch}) translate(-110,-275)">${draw(id)}</g>`}</g></svg>`;
    }

    function botanicalStem(d, width = 2.3) {
      return `<path class="plant-stem" d="${d}" fill="none" stroke="#636b47" stroke-width="${width}"/>
        <path d="${d}" fill="none" stroke="#b7b28a" stroke-width="${width * .24}" opacity=".65"/>`;
    }

    // A serrated leaf includes a midrib, curved secondary veins and etched shading.
    function botanicalLeaf(id, x, y, angle, length = 65, width = 17, shape = 'serrated') {
      angle += (botanicalRandom() - .5) * 9;
      length *= .95 + botanicalRandom() * .1;
      const clipId = `${id}-leaf-detail-${++botanicalDetailCounter}`;
      let outline = '';
      if (shape === 'heart') {
        outline = `M0,0 C${-width * 1.7},${-length * .05} ${-width * 1.9},${-length * .57} ${-width * .5},${-length * .55}
          Q${-width * .05},${-length * .74} 0,${-length}
          Q${width * .4},${-length * .72} ${width},${-length * .52}
          C${width * 2},${-length * .5} ${width * 1.5},${-length * .03} 0,0 Z`;
      } else if (shape === 'lobed') {
        outline = `M0,0 Q-9,-5 -9,-13 Q-21,-10 -20,-19 L-16,-24
          Q-24,-24 -28,-35 Q-17,-39 -14,-34 Q-23,-47 -20,-55
          Q-10,-52 -8,-46 Q-6,${-length+7} 0,${-length}
          Q7,${-length+9} 8,-46 Q15,-53 21,-54 Q24,-45 14,-35
          Q23,-39 28,-33 Q26,-24 15,-24 L20,-17 Q14,-10 8,-12 Q9,-5 0,0 Z`;
      } else {
        const edge = [];
        for (let side of [-1, 1]) {
          for (let j = 0; j <= 20; j++) {
            const t = side < 0 ? j / 20 : 1 - j / 20;
            const breadth = width * Math.pow(Math.sin(Math.PI * t), .82) * (j % 2 ? 1 : .84);
            edge.push(`${(side * breadth + Math.sin(t * Math.PI) * 2).toFixed(2)},${(-length * t).toFixed(2)}`);
          }
        }
        outline = `M${edge.join(' L')} Z`;
      }
      let veins = `<path d="M0,0 Q3,${-length * .45} 0,${-length}" stroke="#d2c9a2" stroke-width=".8" fill="none"/>`;
      for (let j = 1; j < 10; j++) {
        const t = j / 11, yv = -length * t;
        const reach = width * Math.pow(Math.sin(Math.PI * t), .82) * (shape === 'heart' ? 1.25 : .93);
        for (let side of [-1, 1]) {
          veins += `<path d="M1,${yv + 6} Q${side * reach * .5},${yv + 1} ${side * reach},${yv - 8}
            M${side * reach * .45},${yv + 1} l${side * reach * .18},-7" fill="none" stroke="#d5cfab" stroke-width=".5" opacity=".7"/>
            <path d="M${side * reach * .45},${yv + 6} l${side * reach * .35},-4" stroke="#414d36" stroke-width=".42" opacity=".6"/>`;
        }
      }
      return `<g transform="translate(${x},${y}) rotate(${angle})"><g class="plant-leaf">
        <path d="${outline}" fill="url(#${id}-leaf)" stroke="#4d563d" stroke-width=".8"/>
        <defs><clipPath id="${clipId}"><path d="${outline}"/></clipPath></defs>
        <g clip-path="url(#${clipId})">${veins}</g></g></g>`;
    }

    function botanicalBranch(id, x, y, angle, size = 1) {
      return `<g transform="translate(${x},${y}) rotate(${angle}) scale(${size})">
        ${botanicalStem('M0,0 Q-3,-35 1,-87', 1.5)}
        ${botanicalLeaf(id, 0, -12, -56, 38, 10)}
        ${botanicalLeaf(id, 0, -29, 48, 39, 11)}
        ${botanicalLeaf(id, 0, -48, -50, 34, 9)}
        ${botanicalLeaf(id, 1, -64, 14, 36, 10)}</g>`;
    }

    function botanicalPetal(id, tone, angle, length = 42, width = 18, kind = 'ruffled', index = 0) {
      angle += (botanicalRandom() - .5) * 5;
      length *= .95 + botanicalRandom() * .1;
      width *= .94 + botanicalRandom() * .12;
      const d = kind === 'slender'
        ? 'M0,3 C-7,-9 -7,-31 -3,-42 Q0,-48 4,-42 C10,-27 7,-7 0,3 Z'
        : 'M0,3 C-7,-4 -19,-15 -18,-28 Q-25,-38 -15,-43 Q-8,-48 -1,-42 Q7,-48 14,-43 Q24,-40 19,-30 C23,-18 10,-3 0,3 Z';
      const c = botanicalPalettes[tone];
      const hatch = [-.66, -.4, -.15, .13, .4, .65].map((v, j) =>
        `<path d="M${v * 4},-3 Q${v * 18 + (j % 2 ? 1 : -1)},-19 ${v * 22},${-32 - (j % 3) * 2}"/>`).join('');
      return `<g transform="rotate(${angle}) scale(${width / (kind === 'slender' ? 8 : 21)},${length / 46})">
        <g class="botanical-petal"><path d="${d}" fill="url(#${id}-${tone})" stroke="${c[2]}" stroke-width=".65"/>
        <g fill="none" stroke="${c[2]}" stroke-width=".42" opacity="${.35 + index % 3 * .07}">${hatch}</g>
        <path d="M-15,-39 Q-9,-44 -2,-39 M5,-41 Q11,-44 17,-37" fill="none" stroke="${c[0]}" stroke-width=".9" opacity=".8"/>
        </g></g>`;
    }

    function botanicalCenter(tone = 'gold', radius = 7, stamens = 18) {
      const c = botanicalPalettes[tone];
      let detail = '';
      for (let j = 0; j < stamens; j++) {
        const a = j * 2.39996, r = radius * Math.sqrt((j + .5) / stamens);
        detail += `<circle cx="${Math.cos(a) * r}" cy="${Math.sin(a) * r}" r="${Math.max(.45, radius * .085)}" fill="${j % 3 ? c[2] : c[0]}"/>`;
      }
      return `<circle r="${radius}" fill="${c[1]}" stroke="${c[2]}" stroke-width=".7"/>${detail}`;
    }

    function botanicalOpenFlower(id, x, y, scale = 1, tone = 'rose', count = 5, angle = 0, length = 41, details = {}) {
      return `<g transform="translate(${x},${y}) rotate(${angle}) scale(${scale})"><g class="plant-flower-head">
        ${Array.from({length: count}, (_, i) => botanicalPetal(id, tone, i * 360 / count + Math.sin(i * 3) * 5,
          length + Math.sin(i * 2) * 3, count > 7 ? 9 : 22, count > 7 ? 'slender' : 'ruffled', i)).join('')}
        ${details.center || botanicalCenter(details.tone || 'gold', details.radius || (count > 7 ? 9 : 6.5), 24)}${details.extra || ''}</g></g>`;
    }

    function botanicalBud(id, x, y, scale = 1, tone = 'rose', angle = -20) {
      return `<g transform="translate(${x},${y}) rotate(${angle}) scale(${scale})"><g class="plant-flower-head">
        <path d="M0,8 C-12,-2 -11,-19 -2,-25 C10,-22 13,-6 0,8 Z" fill="url(#${id}-${tone})" stroke="${botanicalPalettes[tone][2]}" stroke-width=".8"/>
        <path d="M0,8 C-7,-1 -12,-5 -11,-12 L0,-2 7,-16 Q12,-2 0,8" fill="#77805b" stroke="#535a3c" stroke-width=".7"/>
        <path d="M-2,-4 Q-6,-15 -2,-21 M3,-6 Q7,-14 2,-21" fill="none" stroke="${botanicalPalettes[tone][2]}" stroke-width=".5"/>
        </g></g>`;
    }

    function botanicalRoseHead(id, x, y, scale = 1, tone = 'rose') {
      const c = botanicalPalettes[tone];
      let layers = '';
      // Staggered, cupped petals form an irregular rosette rather than concentric ellipses.
      for (let ring = 0; ring < 4; ring++) {
        const n = [9, 8, 6, 5][ring], r = [31, 23, 14, 6][ring];
        for (let j = 0; j < n; j++) {
          const a = j * 360 / n + ring * 29;
          const w = [23, 20, 16, 10][ring] + Math.sin(j * 7 + ring) * 2;
          const h = [25, 23, 20, 13][ring];
          layers += `<g transform="rotate(${a}) translate(0,${-r})"><g class="botanical-petal">
            <path d="M${-w},6 C${-w - 7},-4 ${-w + 2},${-h} -5,${-h + 3}
              Q3,${-h - 7} 11,${-h + 2} C${w + 10},${-h + 1} ${w + 5},2 ${w - 2},8 Q0,20 ${-w},6 Z"
              fill="url(#${id}-${tone})" stroke="${c[2]}" stroke-width=".7"/>
            <path d="M${-w + 3},2 Q-9,-8 -8,${-h + 5} M-3,9 Q-2,-4 1,${-h + 4}
              M7,8 Q14,-2 13,${-h + 5} M${-w + 2},-7 Q-7,${-h + 2} -3,${-h + 1}"
              fill="none" stroke="${c[2]}" stroke-width=".48" opacity=".5"/>
            <path d="M${-w + 2},-8 Q-10,${-h + 1} -5,${-h + 1}" stroke="${c[0]}" stroke-width="1" fill="none"/>
          </g></g>`;
        }
      }
      return `<g transform="translate(${x},${y}) rotate(-13) scale(${scale})"><g class="plant-flower-head">
        <path d="M-9,37 Q-37,48 -48,25 L-21,29 -37,5 0,19 37,5 24,30 47,28 Q26,47 8,39" fill="#70794f" stroke="#515b3d" stroke-width=".9"/>
        ${layers}<path d="M-5,-4 Q8,-11 9,0 Q6,9 -1,6 Q-8,3 0,-1" fill="none" stroke="${c[2]}" stroke-width="1.1"/>
      </g></g>`;
    }

    function buildCabbageRose(tone = 'rose', peony = false) {
      return botanicalPlate(peony ? 'Blush peony' : 'English cabbage rose', id => `
        ${botanicalStem('M109,275 C104,232 119,199 108,157 Q101,118 112,82', 2.8)}
        ${botanicalStem('M108,162 Q151,136 164,105', 1.8)}
        ${botanicalBranch(id, 112, 221, -54, .9)}
        ${botanicalBranch(id, 111, 174, 65, .85)}
        ${botanicalLeaf(id, 108, 125, -64, 48, 15, peony ? 'lobed' : 'serrated')}
        <path d="M110,240 l-7,-4 7,-3 M111,196 l7,-5 -6,-2" fill="#796347"/>
        ${botanicalBud(id, 165, 101, .8, tone, 20)}
        ${botanicalRoseHead(id, 108, 79, peony ? 1.04 : .96, tone)}`);
    }

    function buildPrimrose() {
      return botanicalPlate('Crimson primrose', id => `
        ${[[-34,-8],[-10,-33],[17,-28],[36,6],[6,28]].map(([x,y]) => botanicalStem(`M109,275 Q${96+x},205 ${109+x},${109+y}`, 1.6)).join('')}
        ${botanicalLeaf(id, 104, 263, -66, 89, 23)}
        ${botanicalLeaf(id, 114, 258, 67, 89, 23)}
        ${botanicalLeaf(id, 107, 265, -26, 73, 20)}
        ${botanicalLeaf(id, 114, 264, 26, 68, 20)}
        ${[[-34,-8,.62],[-10,-33,.67],[17,-28,.56],[36,6,.61],[6,28,.7]].map(([x,y,s],i) => botanicalOpenFlower(id,109+x,109+y,s,'crimson',5,i*19,37)).join('')}`);
    }

    function buildAnemone() {
      return botanicalPlate('Ivory garden anemone', id => `
        ${botanicalStem('M108,275 C99,231 118,199 110,152 Q105,119 116,86')}
        ${botanicalStem('M111,172 Q65,139 65,102', 1.5)}
        ${botanicalStem('M110,149 Q156,112 157,73', 1.6)}
        ${botanicalLeaf(id, 108, 227, -58, 70, 20, 'lobed')}
        ${botanicalLeaf(id, 114, 186, 65, 70, 20, 'lobed')}
        ${botanicalLeaf(id, 108, 147, -53, 52, 15, 'lobed')}
        ${botanicalBud(id, 158, 66, .82, 'ivory', 28)}
        ${botanicalOpenFlower(id, 65, 96, .5, 'ivory', 7, -15)}
        ${botanicalOpenFlower(id, 116, 82, .88, 'ivory', 7, 12, 41, {tone:'crimson', radius:9})}`);
    }

    function buildWildRose() {
      return botanicalPlate('Blush hibiscus', id => `
        ${botanicalStem('M113,275 Q99,229 111,181 Q124,127 112,84', 2.7)}
        ${botanicalStem('M111,154 Q155,122 162,86', 1.5)}
        ${botanicalLeaf(id, 112, 244, -55, 75, 22, 'lobed')}
        ${botanicalLeaf(id, 111, 201, 58, 77, 22, 'lobed')}
        ${botanicalLeaf(id, 115, 158, -65, 66, 20, 'lobed')}
        ${botanicalLeaf(id, 145, 119, 43, 49, 13)}
        ${botanicalBud(id, 165, 83, .72, 'rose', 32)}
        ${botanicalOpenFlower(id, 109, 80, 1.04, 'rose', 5, 17, 45, {extra:`
          <g transform="rotate(11)"><path d="M0,0 Q-4,-13 -2,-28" stroke="#b9a267" stroke-width="2.3" fill="none"/>
          ${Array.from({length:12},(_,i)=>`<circle cx="${-2+Math.sin(i*3)*3}" cy="${-9-i*1.6}" r="1.15" fill="#b49b50"/>`).join('')}
          <circle cx="-2" cy="-29" r="2" fill="#96525b"/></g>`})}`);
    }

    function buildHydrangea() {
      return botanicalPlate('Blush hydrangea', id => {
        let florets = '';
        for (let j=0;j<24;j++) {
          const a=j*2.39996, r=38*Math.sqrt(j/24);
          florets += botanicalOpenFlower(id,108+Math.cos(a)*r,92+Math.sin(a)*r*.72,.23+(j%3)*.025,'rose',4,j*23,34);
        }
        return `${botanicalStem('M110,275 Q105,211 111,153 L108,105',3)}
          ${botanicalLeaf(id,109,242,-53,85,25)}${botanicalLeaf(id,110,205,58,80,24)}
          ${botanicalLeaf(id,110,162,-54,61,20)}${botanicalLeaf(id,112,157,52,57,20)}${florets}`;
      });
    }

    function buildMorningGlory() {
      function trumpet(id,x,y,s,angle) {
        const lobes=Array.from({length:5},(_,i)=> {
          const a=(i*72-90)*Math.PI/180, a2=((i+1)*72-90)*Math.PI/180;
          const mid=(a+a2)/2;
          return `Q${Math.cos(mid)*56},${Math.sin(mid)*56} ${Math.cos(a2)*36},${Math.sin(a2)*36}`;
        }).join(' ');
        return `<g transform="translate(${x},${y}) rotate(${angle}) scale(${s})"><g class="plant-flower-head">
          <path class="botanical-petal" d="M0,-36 ${lobes} Z" fill="url(#${id}-blue)" stroke="#5f7590" stroke-width=".9"/>
          ${Array.from({length:5},(_,i)=>`<g transform="rotate(${i*72})"><path d="M0,1 Q-7,-15 0,-36 Q7,-15 0,1" fill="#ece9d5" opacity=".72"/>
          <path d="M0,-7 Q-10,-24 -17,-30 M3,-9 Q12,-22 19,-29 M0,-10 L0,-32" fill="none" stroke="#5c7f9d" stroke-width=".5" opacity=".7"/></g>`).join('')}
          ${botanicalCenter('ivory',4,9)}</g></g>`;
      }
      return botanicalPlate('Blue morning glory', id=>`
        ${botanicalStem('M107,275 C142,242 84,215 112,175 C143,135 96,122 110,83',1.9)}
        ${botanicalStem('M109,179 Q63,154 62,132 M115,153 Q160,124 159,112',1.4)}
        ${botanicalLeaf(id,110,242,-48,64,15,'heart')}${botanicalLeaf(id,115,197,58,62,15,'heart')}
        ${botanicalLeaf(id,110,151,-41,48,12,'heart')}${botanicalLeaf(id,130,135,37,43,11,'heart')}
        <path d="M115,225 Q152,205 154,218 Q154,232 145,224 M107,171 Q75,167 74,153 Q75,146 81,152" fill="none" stroke="#7a805a" stroke-width="1"/>
        ${trumpet(id,110,77,.9,-11)}${trumpet(id,61,127,.61,-26)}${trumpet(id,158,107,.55,20)}`);
    }

    function buildChamomile() {
      const frond=(x,y,angle,s=1)=>`<g transform="translate(${x},${y}) rotate(${angle}) scale(${s})"><g class="plant-leaf">
        <path d="M0,0 Q-3,-30 0,-61 ${Array.from({length:7},(_,j)=>`M${-j*.2},${-8-j*7} q-12,-3 -15,-14 m15,14 q13,-2 15,-13`).join(' ')}" fill="none" stroke="#899065" stroke-width="1.1"/>
        </g></g>`;
      return botanicalPlate('Field chamomile',id=>`
        ${botanicalStem('M107,275 Q96,219 109,174 Q113,135 108,96',1.7)}
        ${botanicalStem('M107,210 Q63,182 61,147 M109,178 Q151,165 161,123 M109,151 Q73,124 74,94',1.3)}
        ${frond(106,244,-51)}${frond(105,218,56)}${frond(108,188,-45,.75)}${frond(135,167,39,.6)}
        ${botanicalOpenFlower(id,108,88,.8,'ivory',15,2,33)}
        ${botanicalOpenFlower(id,61,142,.56,'ivory',13,13,33)}
        ${botanicalOpenFlower(id,163,117,.64,'ivory',14,9,33)}
        ${botanicalOpenFlower(id,73,88,.4,'gold',12,16,33)}`);
    }

    function buildJasmine() {
      return botanicalPlate('White jasmine',id=>{
        const clusters=[[100,77,.51],[126,70,.45],[143,92,.47],[101,104,.45],[131,111,.5],[164,145,.38]];
        return `${botanicalStem('M107,275 Q115,213 106,168 Q97,124 112,88',2.2)}
          ${botanicalStem('M108,191 Q153,177 164,147 M105,150 Q68,134 68,112',1.4)}
          ${botanicalBranch(id,109,245,-52,.85)}${botanicalBranch(id,107,205,59,.9)}
          ${botanicalLeaf(id,105,151,-51,57,17)}${botanicalLeaf(id,128,123,58,52,15)}
          ${clusters.map(([x,y,s],i)=>botanicalOpenFlower(id,x,y,s,'ivory',5,i*11,35)).join('')}
          ${botanicalBud(id,67,109,.65,'ivory',-24)}${botanicalBud(id,148,65,.55,'ivory',19)}`;
      });
    }

    function buildRoyalLily() {
      return botanicalPlate('Speckled tiger lily',id=>{
        let bloom='';
        for(let i=0;i<6;i++) {
          bloom+=`<g transform="rotate(${i*60+14})"><g class="botanical-petal">
            <path d="M0,4 C-18,-7 -21,-37 -10,-52 Q1,-68 17,-50 Q0,-53 5,-34 Q15,-10 0,4 Z" fill="url(#${id}-gold)" stroke="#9c7650" stroke-width=".8"/>
            <path d="M1,-4 Q-11,-27 -8,-49" fill="none" stroke="#ac8050" stroke-width=".5"/>
            ${Array.from({length:11},(_,j)=>`<ellipse cx="${Math.sin(j*5)*6-3}" cy="${-8-j*3.1}" rx=".9" ry="1.3" fill="#8e5442"/>`).join('')}
            </g></g>`;
        }
        return `${botanicalStem('M111,275 Q100,202 112,146 L111,79',2.5)}
          ${botanicalLeaf(id,110,242,-38,80,9)}${botanicalLeaf(id,108,211,38,77,10)}
          ${botanicalLeaf(id,110,176,-46,63,8)}${botanicalLeaf(id,111,147,46,58,8)}
          <g transform="translate(110,77)"><g class="plant-flower-head">${bloom}
          ${Array.from({length:5},(_,i)=>`<path d="M0,0 Q${-15+i*6},-12 ${-14+i*7},-24" fill="none" stroke="#7d7850" stroke-width="1"/>
            <ellipse cx="${-14+i*7}" cy="-24" rx="2.7" ry="1.5" fill="#895b3e"/>`).join('')}</g></g>`;
      });
    }

    function buildWildPoppy() {
      return botanicalPlate('Crimson field poppy',id=>`
        ${botanicalStem('M108,275 Q98,220 110,170 Q122,129 110,83',1.9)}
        ${botanicalStem('M110,186 Q157,150 155,116 Q153,101 142,108',1.4)}
        ${botanicalLeaf(id,107,240,-50,78,18,'lobed')}${botanicalLeaf(id,111,200,53,70,17,'lobed')}
        ${botanicalLeaf(id,111,153,-61,55,16,'lobed')}${botanicalBud(id,140,114,.75,'crimson',-51)}
        ${botanicalOpenFlower(id,110,77,1.06,'crimson',4,26,46,{center:`
          <g fill="none" stroke="#4e4937" stroke-width=".7">
          ${Array.from({length:28},(_,i)=>`<g transform="rotate(${i*360/28})"><path d="M0,-4 L0,-12"/><circle cy="-13" r="1.15" fill="#504738"/></g>`).join('')}
          </g>${botanicalCenter('ivory',6,15)}`})}`);
    }

    function buildFoxgloveSpire() {
      return botanicalPlate('Rose foxglove spire',id=>{
        let bells='';
        for(let i=0;i<11;i++) {
          const side=i%2?-1:1, y=178-i*13, x=110+side*(14-i*.65), s=.9-i*.047;
          bells+=botanicalStem(`M110,${y+3} L${x},${y-4}`,1);
          bells+=`<g transform="translate(${x},${y}) rotate(${side*-23}) scale(${s})"><g class="plant-flower-head"><g class="botanical-petal">
            <path d="M-6,-15 Q-13,-9 -14,8 Q-17,25 -4,28 Q7,30 12,18 Q16,6 7,-12 Q0,-18 -6,-15 Z" fill="url(#${id}-violet)" stroke="#86687d" stroke-width=".8"/>
            <ellipse cx="-1" cy="19" rx="9" ry="6" fill="#f3e2dc" stroke="#a27c8d" stroke-width=".7"/>
            <path d="M-7,-9 Q-13,5 -11,14 M-2,-12 Q-7,4 -6,11 M5,-9 Q10,3 8,10" fill="none" stroke="#9a748c" stroke-width=".5"/>
            ${Array.from({length:8},(_,j)=>`<circle cx="${Math.sin(j*4)*5-1}" cy="${15+(j%3)*2.5}" r=".9" fill="#9b647f"/>`).join('')}
            </g></g></g>`;
        }
        return `${botanicalStem('M110,275 Q105,214 111,143 Q116,95 108,34',2.4)}
          ${botanicalLeaf(id,108,267,-45,91,20)}${botanicalLeaf(id,113,263,45,86,19)}
          ${botanicalLeaf(id,110,229,-33,62,13)}${botanicalLeaf(id,110,210,42,53,12)}
          ${bells}${botanicalBud(id,108,35,.46,'violet',-12)}`;
      });
    }

    function buildRoyalSunflower() {
      return botanicalPlate('Golden sunflower',id=>`
        ${botanicalStem('M110,275 Q103,211 113,155 L110,84',3.3)}
        ${botanicalLeaf(id,109,242,-52,78,19,'heart')}${botanicalLeaf(id,111,194,56,78,19,'heart')}
        ${botanicalLeaf(id,111,153,-58,51,15)}
        <g transform="translate(110,78) rotate(8)"><g class="plant-flower-head">
        ${Array.from({length:24},(_,i)=>botanicalPetal(id,'gold',i*15,48+(i%3)*3,6.5,'slender',i)).join('')}
        ${botanicalCenter('gold',22,135)}
        <circle r="16" fill="#806c47" opacity=".56"/>
        ${Array.from({length:60},(_,i)=>{const a=i*2.39996,r=15*Math.sqrt(i/60);return `<circle cx="${Math.cos(a)*r}" cy="${Math.sin(a)*r}" r=".65" fill="${i%3?'#c6b47b':'#514e37'}"/>`;}).join('')}
        </g></g>`);
    }

    function buildClassicalUrn() {
      return botanicalPlate('Classical stone urn with botanical bouquet',id=>`
        <defs><linearGradient id="${id}-stone"><stop stop-color="#afa58e"/><stop offset=".45" stop-color="#e6dcc6"/><stop offset="1" stop-color="#9d947c"/></linearGradient></defs>
        ${botanicalBranch(id,89,176,-46,.8)}${botanicalBranch(id,132,175,47,.9)}
        ${botanicalStem('M95,177 Q77,139 85,112 M125,177 Q147,143 139,116',1.8)}
        ${botanicalLeaf(id,108,173,-20,61,19)}
        ${botanicalRoseHead(id,93,125,.52,'rose')}${botanicalOpenFlower(id,138,123,.48,'ivory',7)}
        ${botanicalOpenFlower(id,115,99,.45,'crimson',5)}
        <g class="urn-base"><path d="M71,178 C70,213 92,227 103,230 L102,248 H84 V263 H139 V248 H119 L118,230 C134,223 151,208 150,178 Z" fill="url(#${id}-stone)" stroke="#756c57" stroke-width="1"/>
          <ellipse cx="110" cy="178" rx="41" ry="7" fill="#d7ccb6" stroke="#756c57" stroke-width="1"/>
          <path d="M78,187 Q110,202 143,187 M88,214 Q110,225 133,214 M85,253 H138 M96,193 Q94,212 106,224 M110,197 V225 M124,195 Q129,212 116,225" fill="none" stroke="#a4997f" stroke-width="1"/>
        </g>`);
    }

    function buildRomanticPeony() {
      return botanicalPlate('Blush garden peony', id => {
        let petals = '';
        for (let ring=0;ring<3;ring++) {
          const count=[8,7,6][ring],radius=[29,20,11][ring];
          for (let j=0;j<count;j++) {
            const w=[27,23,17][ring]+botanicalRandom()*3,h=[25,22,17][ring];
            const angle=j*360/count+ring*27+(botanicalRandom()-.5)*7;
            petals+=`<g transform="rotate(${angle}) translate(0,${-radius})"><g class="botanical-petal">
              <path d="M${-w},4 C${-w-6},-10 ${-w+4},${-h-3} -5,${-h+1}
                Q4,${-h-7} 13,${-h+2} C${w+8},${-h-2} ${w+6},4 ${w-2},11 Q0,23 ${-w},4 Z"
                fill="url(#${id}-rose)" stroke="#9a4c59" stroke-width=".65"/>
              <path d="M${-w+4},-5 Q-13,-13 -9,${-h+4} M-6,9 Q-8,-4 -3,${-h+3}
                M5,12 Q4,-3 9,${-h+4} M14,8 Q22,-4 19,${-h+7}" fill="none" stroke="#9a4c59" stroke-width=".45" opacity=".48"/>
              <path d="M${-w+4},-11 Q-12,${-h-1} -6,${-h+3}" stroke="#f3d5ce" stroke-width="1.2" fill="none"/>
              </g></g>`;
          }
        }
        return `${botanicalStem('M110,275 Q102,215 114,159 L109,91',3)}
          ${botanicalLeaf(id,110,243,-50,79,23,'lobed')}${botanicalLeaf(id,110,198,56,75,22,'lobed')}
          ${botanicalLeaf(id,110,145,-60,60,20,'lobed')}
          ${botanicalStem('M112,177 Q161,146 164,123',1.7)}${botanicalBud(id,164,117,.8,'rose',22)}
          <g transform="translate(108,82) scale(1.08,.83)"><g class="plant-flower-head">
          <path d="M-9,37 Q-35,48 -48,25 L-21,29 -37,5 0,19 37,5 24,30 47,28 Q26,47 8,39" fill="#70794f" stroke="#515b3d" stroke-width=".9"/>
          ${petals}${botanicalCenter('gold',9,32)}</g></g>`;
      });
    }

    const botanicalBuilders = {
      primrose: buildPrimrose, anemone: buildAnemone, wildrose: buildWildRose,
      hydrangea: buildHydrangea, morningglory: buildMorningGlory,
      chamomile: buildChamomile, rose: buildCabbageRose, jasmine: buildJasmine,
      lily: buildRoyalLily, poppy: buildWildPoppy, foxglove: buildFoxgloveSpire,
      peony: buildRomanticPeony, sunflower: buildRoyalSunflower,
      urn: buildClassicalUrn
    };

    function generateBotanicalSVG(variety, seed = 42) {
      botanicalRandom = seededRandom(seed);
      const mix = ['primrose', 'anemone', 'wildrose', 'hydrangea', 'morningglory', 'chamomile', 'rose', 'jasmine'];
      const key = botanicalBuilders[variety] ? variety : mix[Math.floor(botanicalRandom() * mix.length)];
      return botanicalBuilders[key]();
    }

