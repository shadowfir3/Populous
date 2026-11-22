import {SIZE,rng} from './world.mjs';
import {SPECIES} from './simulation.mjs';
const tau=Math.PI*2;
export function drawTerrain(canvas,world){
  const g=canvas.getContext('2d',{alpha:false});
  g.putImageData(new ImageData(world.rgba,SIZE,SIZE),0,0);
  // Small ink marks distinguish forest, prairie and water at atlas scale.
  const random=rng(world.seed^18273);
  for(let i=0;i<11500;i++){
    const x=Math.floor(random.next()*SIZE),y=Math.floor(random.next()*SIZE),kind=world.terrain[y*SIZE+x];
    if(kind===1||kind===5){
      const h=2+random.next()*4;
      g.fillStyle=kind===1?'rgba(44,74,53,.26)':'rgba(29,67,46,.23)';
      if(kind===1){
        g.beginPath();g.moveTo(x,y-h);g.lineTo(x-h*.44,y);g.lineTo(x+h*.44,y);g.fill();g.fillRect(x,y,1,1.4);
      }else{g.fillRect(x,y,h*.85,1);g.fillRect(x+1,y-1.5,h*.5,2);}
    }else if(kind===6 && i%5===0){
      g.fillStyle='rgba(226,236,214,.30)';g.fillRect(x,y,3+random.next()*5,.9);
    }else if((kind===3||kind===2)&&i%3===0){
      g.fillStyle='rgba(75,87,50,.23)';g.fillRect(x,y,1,2);g.fillRect(x+2,y-1,1,2);
    }
  }
}
function labelPosition(world,kind,targetX,targetY,placed){
  let best=null, score=Infinity;
  for(let y=48;y<SIZE-50;y+=12)for(let x=88;x<SIZE-88;x+=16){
    if(world.terrain[y*SIZE+x]!==kind)continue;
    const distance=((x-targetX)/1.2)**2+((y-targetY)*1.35)**2;
    if(distance>=score || placed.some(p=>Math.abs(p.x-x)<185 && Math.abs(p.y-y)<78))continue;
    let penalty=0;
    for(const [dx,dy] of [[-55,0],[55,0],[0,18],[0,-18],[-30,-10],[30,10]]){
      if(world.terrain[(y+dy)*SIZE+x+dx]!==kind)penalty+=7500;
    }
    if(distance+penalty<score){best={x,y};score=distance+penalty;}
  }
  return best;
}
export function drawLabels(canvas,world){
  const g=canvas.getContext('2d');g.clearRect(0,0,SIZE,SIZE);
  g.strokeStyle='rgba(37,64,48,.21)';g.lineWidth=1;g.setLineDash([4,7]);g.beginPath();
  for(let at=135;at<SIZE;at+=135){g.moveTo(at,0);g.lineTo(at,SIZE);g.moveTo(0,at);g.lineTo(SIZE,at);}
  g.stroke();g.setLineDash([]);
  g.fillStyle='rgba(44,63,49,.66)';g.font='15px monospace';g.textAlign='left';
  for(const [y,lat] of [[270,'45° N'],[540,'0°'],[810,'45° S']])g.fillText(lat,13,y-7);
  const placed=[{x:994,y:87},{x:112,y:1022}];
  const names=[[0,'Northern icefields',485,51],[1,'Boreal forest',340,190],[2,'Grasslands',735,265],[3,'Steppe',270,355],[5,'Equatorial jungle',700,520],[4,'Desert',340,625],[0,'Southern icefields',565,1031]];
  for(const [kind,name,x,y] of names){
    const point=labelPosition(world,kind,x,y,placed);if(!point)continue;placed.push(point);
    g.save();g.translate(point.x,point.y);g.rotate(-.035);
    g.textAlign='center';g.textBaseline='middle';g.font='italic 24px Georgia,serif';
    g.lineJoin='round';g.lineWidth=3.4;g.strokeStyle='rgba(242,239,211,.60)';g.fillStyle='rgba(43,64,46,.86)';
    g.strokeText(name,0,0);g.fillText(name,0,0);g.restore();
  }
  g.save();g.translate(SIZE-62,74);g.fillStyle='#344b3e';g.textAlign='center';g.font='bold 18px Georgia,serif';g.fillText('N',0,-33);
  g.strokeStyle='#354d40';g.lineWidth=1.2;g.beginPath();g.arc(0,0,19,0,tau);g.stroke();
  for(let i=0;i<4;i++){g.save();g.rotate(i*Math.PI/2);const len=i%2?23:30;
    g.fillStyle='#344b3e';g.beginPath();g.moveTo(0,-len);g.lineTo(-5,0);g.lineTo(0,0);g.fill();
    g.fillStyle='#eeeeda';g.beginPath();g.moveTo(0,-len);g.lineTo(5,0);g.lineTo(0,0);g.fill();g.stroke();g.restore();}
  g.restore();
  g.save();g.translate(22,SIZE-26);g.fillStyle='#344a3c';g.font='15px monospace';g.textAlign='left';g.fillText('500 km',0,-8);
  const w=500/Math.sqrt(10);g.fillRect(0,0,w,3);g.fillStyle='#f1efda';g.fillRect(w/2,0,w/2,2);g.restore();
}
export function drawAnimals(canvas,sim,settings){
  const g=canvas.getContext('2d');g.clearRect(0,0,SIZE,SIZE);
  if(!settings.life)return;
  for(let s=0;s<7;s++){
    if(!settings.visible[s])continue;
    const color=SPECIES[s].color;
    g.fillStyle='#35403099';
    for(const a of sim.cells[s].values())g.fillRect(a.pos%SIZE-1,Math.floor(a.pos/SIZE)-1,3.8,3.8);
    g.fillStyle=color;
    for(const a of sim.cells[s].values())g.fillRect(a.pos%SIZE-.6,Math.floor(a.pos/SIZE)-.7,2.9,2.9);
  }
}
export function sparkline(canvas,history,now){
  const rows=history.range(Math.max(0,now-70),now,100);
  const data=rows.map(r=>r.slice(1).reduce((a,b)=>a+b,0));
  const g=canvas.getContext('2d'),w=canvas.width,h=canvas.height;g.clearRect(0,0,w,h);
  if(!data.length)return;
  const lo=Math.min(...data)-1,hi=Math.max(...data)+1;
  g.strokeStyle='#9ba98a';g.setLineDash([3,4]);g.beginPath();g.moveTo(0,h-4);g.lineTo(w,h-4);g.stroke();g.setLineDash([]);
  g.beginPath();
  for(let i=0;i<data.length;i++){
    const x=w-3-(data.length-1-i)*(w-6)/Math.max(18,data.length-1),y=h-6-(data[i]-lo)/(hi-lo)*(h-10);
    if(i===0)g.moveTo(x,y);else g.lineTo(x,y);
  }
  const last=h-6-(data.at(-1)-lo)/(hi-lo)*(h-10);
  g.strokeStyle='#758b67';g.lineWidth=2.1;g.stroke();g.fillStyle='#718a61';g.beginPath();g.arc(w-3,last,2.8,0,tau);g.fill();
}
export function drawGraph(canvas,sim,settings,windowScale,endTick,fit){
  const w=canvas.clientWidth,h=canvas.clientHeight;if(!w || !h)return null;
  const dpr=Math.min(2,devicePixelRatio||1);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
  const g=canvas.getContext('2d');g.scale(dpr,dpr);
  const left=w<500?50:68,right=18,top=37,bottom=43,width=w-left-right,height=h-top-bottom;
  const span=fit?Math.max(1,sim.tick):Math.max(1,Math.floor(width*windowScale));
  const end=endTick===null?sim.tick:Math.max(Math.min(span,sim.tick),Math.min(sim.tick,endTick));
  const start=Math.max(0,end-span),domainEnd=fit?Math.max(1,end):Math.max(span,end);
  const rows=sim.history.range(start,end,width);
  if(end===sim.tick&&rows.at(-1)?.[0]!==end)rows.push([end,...sim.counts]);
  let maximum=1;
  for(const row of rows)for(let s=0;s<7;s++)if(settings.series[s])maximum=Math.max(maximum,row[s+1]);
  const step=10**Math.floor(Math.log10(maximum));maximum=Math.ceil(maximum/step)*step;
  g.font='12px monospace';g.fillStyle='#63715f';g.textAlign='left';g.fillText('Population',left,17);
  for(let i=0;i<=4;i++){
    const y=top+i*height/4;g.textAlign='right';g.fillText(Math.round(maximum*(1-i/4)).toLocaleString(),left-10,y+4);
    g.strokeStyle='#d9ddce';g.setLineDash([4,5]);g.beginPath();g.moveTo(left,y);g.lineTo(w-right,y);g.stroke();
  }
  const divisions=w<500?3:6;
  for(let i=0;i<=divisions;i++){const x=left+i*width/divisions;g.textAlign=i===divisions?'right':'center';g.fillText(Math.round(start+i*(domainEnd-start)/divisions).toLocaleString(),x,h-23);}
  g.setLineDash([]);g.textAlign='center';g.fillText('Simulation tick',left+width/2,h-3);
  for(let s=0;s<7;s++){
    if(!settings.series[s])continue;
    g.strokeStyle=SPECIES[s].color;g.fillStyle=SPECIES[s].color;g.lineWidth=2;g.lineJoin='round';g.beginPath();let x,y;
    rows.forEach((row,i)=>{x=left+(row[0]-start)/(domainEnd-start)*width;y=top+height*(1-row[s+1]/maximum);if(i)g.lineTo(x,y);else g.moveTo(x,y);});
    g.stroke();if(rows.length){g.beginPath();g.arc(x,y,2.7,0,tau);g.fill();}
  }
  return {span,end};
}
