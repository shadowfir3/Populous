export const SIZE = 1080;
export const CELLS = SIZE * SIZE;
export const BIOMES = [
  {name:'Polar ice', color:'#e4e9db', capacity:34, recovery:24},
  {name:'Boreal forest', color:'#77977c', capacity:157, recovery:5},
  {name:'Grassland', color:'#a7b97c', capacity:202, recovery:3},
  {name:'Steppe', color:'#c3b576', capacity:93, recovery:9},
  {name:'Desert', color:'#d9b77c', capacity:38, recovery:18},
  {name:'Jungle', color:'#548367', capacity:244, recovery:2},
  {name:'Water', color:'#76a7a6', capacity:191, recovery:4}
];
export function rng(seed) {
  return {
    state: seed >>> 0,
    next() {
      this.state = (this.state + 0x6D2B79F5) >>> 0;
      let n = Math.imul(this.state ^ this.state >>> 15, 1 | this.state);
      n ^= n + Math.imul(n ^ n >>> 7, 61 | n);
      return ((n ^ n >>> 14) >>> 0) / 4294967296;
    }
  };
}
const clamp = (x,min,max) => Math.min(max,Math.max(min,x));
function noiseSource(random) {
  const a = Float32Array.from({length:65536},()=>random.next());
  return (x,y) => {
    const ix=Math.floor(x), iy=Math.floor(y);
    const u=x-ix, v=y-iy, sx=u*u*(3-2*u), sy=v*v*(3-2*v);
    const i=ix&255, j=iy&255, k=(i+1)&255, l=(j+1)&255;
    const top=a[(j<<8)|i]*(1-sx)+a[(j<<8)|k]*sx;
    const bottom=a[(l<<8)|i]*(1-sx)+a[(l<<8)|k]*sx;
    return top+(bottom-top)*sy;
  };
}
export function generateWorld(seed) {
  const random=rng(seed), noise=noiseSource(random);
  const elevation=new Uint16Array(CELLS), relief=new Float32Array(CELLS);
  const wetness=new Uint8Array(CELLS), climate=new Uint8Array(CELLS);
  const histogram=new Uint32Array(4096);
  const scale=0.0034, offset=10+random.next()*100;
  const terrain=new Uint8Array(CELLS), temperature=new Int8Array(CELLS), capacity=new Uint8Array(CELLS);
  for(let y=0,p=0;y<SIZE;y++) {
    for(let x=0;x<SIZE;x++,p++) {
      const a=x*scale, b=y*scale;
      const u=a+.85*noise(a*1.6+14,b*1.6)+.08*noise(a*11,b*11), v=b+.85*noise(a*1.6,b*1.6+77)+.07*noise(a*9+2,b*9);
      let e=0, amp=.5, f=1;
      for(let i=0;i<7;i++,amp*=.51,f*=2.06) e+=noise(u*f+offset+i*8,v*f+i*11)*amp;
      const h=clamp(Math.floor(e*4095),0,4095);
      elevation[p]=h; histogram[h]++;
      const moisture=.65*noise(a*1.3+33,b*1.3+9)+.35*noise(u*3+84,v*3);
      wetness[p]=moisture*255;
      const lat=Math.abs(2*y/(SIZE-1)-1);
      climate[p]=clamp((1-lat+.39*(e-.5)+.22*(noise(u*1.8,v*1.8+51)-.5)+.045*(noise(a*16,b*16)-.5))*255,0,255);
      // Folded ridges give the map a directional, engraved relief.
      const fold=noise(u*4.7+19,v*4.7+7)+.31*noise(u*14.8,v*14.8)+.095*noise(u*38,v*38);
      const ridge=Math.pow(1-Math.min(1,Math.abs(fold-.64)*2.8),3);
      const detail=noise(u*22,v*22)+.45*noise(u*58+81,v*58);
      relief[p]=e*138+ridge*clamp((e-.32)*160,0,50)+detail*(2.5+ridge*2.8);
    }
  }
  const target=CELLS*(.158+random.next()*.039);
  let level=0, total=0;
  while(level<4095 && total+histogram[level]<=target) total+=histogram[level++];
  const rgba=new Uint8ClampedArray(CELLS*4), counts=Array(7).fill(0);
  const base=[[220,226,213],[111,144,115],[157,177,112],[190,177,111],[217,183,126],[71,117,85],[110,159,160]];
  for(let y=0,p=0;y<SIZE;y++) {
    for(let x=0;x<SIZE;x++,p++) {
      const e=elevation[p], c=climate[p]/255, wet=wetness[p]/255;
      const kind=e<level?6:c<.13?0:c<.32?1:c<.53?2:c<.69?(wet>.58?2:3):c<.88?(wet>.53?5:4):(wet<.33?4:5);
      terrain[p]=kind; counts[kind]++;
      temperature[p]=Math.round(-19+53*c-9*(e/4095-.45));
      capacity[p]=Math.round(BIOMES[kind].capacity*(.87+.13*wet));
      const grain=(random.next()-.5)*12;
      const slope=relief[p]-relief[Math.max(0,p-(x>0?1:0)-(y>0?SIZE:0))];
      const ridge=relief[p]-e/4095*138;
      let tone=clamp(slope*4.6,-35,34)+ridge*.22+(e/4095-.5)*62+grain;
      const color=base[kind]; let r=color[0],g=color[1],b=color[2];
      if(kind===6) {
        const depth=clamp((level-e)/650,0,1);
        r=147-depth*65;g=187-depth*42;b=179-depth*29;
        const band=(level-e)%60;
        tone=grain*.28+(band<5?5:0);
        if(level-e<12) {r=198;g=211;b=185;}
      } else {
        if(e-level<13) {r=205;g=201;b=152;tone*=.5;}
        const contour=relief[p]%3.4;
        if(contour<.34) tone-=11;
        if(kind===1 || kind===5) tone+=Math.max(0,noise(x*.43,y*.51)-.45)*26-5;
        if(kind===0) tone*=.79;
      }
      const i=p*4;rgba[i]=r+tone;rgba[i+1]=g+tone;rgba[i+2]=b+tone;rgba[i+3]=255;
    }
  }
  return {seed,terrain,temperature,capacity,rgba,counts};
}
