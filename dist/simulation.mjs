import {SIZE,CELLS,BIOMES,rng} from './world.mjs';

export const SPECIES = [
  {name:'Snails',singular:'Snail',color:'#b76f39',speed:.18,breed:78,hunger:.80,life:610,rank:0,habitat:'land',prey:[],initial:920},
  {name:'Birds',singular:'Bird',color:'#4c869e',speed:2.4,breed:115,hunger:.53,life:850,rank:1,habitat:'land',prey:[0],initial:344},
  {name:'Cats',singular:'Cat',color:'#b58843',speed:1.65,breed:165,hunger:.34,life:1050,rank:2,habitat:'land',prey:[1],initial:134},
  {name:'Wolves',singular:'Wolf',color:'#855e86',speed:1.9,breed:230,hunger:.24,life:1380,rank:3,habitat:'land',prey:[2],initial:56},
  {name:'Small fish',singular:'Small fish',color:'#348f8c',speed:1.2,breed:68,hunger:.85,life:540,rank:0,habitat:'water',prey:[],initial:702},
  {name:'Amphibians',singular:'Amphibian',color:'#759348',speed:.74,breed:117,hunger:.49,life:790,rank:1,habitat:'both',prey:[4,0],initial:227},
  {name:'Sharks',singular:'Shark',color:'#526c8c',speed:2.1,breed:205,hunger:.29,life:1200,rank:2,habitat:'water',prey:[4,5],initial:71}
];
const dirs=[[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];
function offset(p,dx,dy) {
  const x=p%SIZE+dx, y=Math.floor(p/SIZE)+dy;
  return x<0||y<0||x>=SIZE||y>=SIZE?-1:y*SIZE+x;
}
const fits=(s,biome)=>s===5 || (s===4||s===6)===(biome===6);
export class lifeform {
  #reproductionState;
  constructor(id,species,pos,age,health,saturation,cycle) {
    Object.assign(this,{id,species,pos,age,health,saturation});
    this.#reproductionState=cycle;
  }
  get name(){return SPECIES[this.species].singular+' '+this.id;}
  get movementSpeed(){return SPECIES[this.species].speed;}
  get reproductionRate(){return 1/SPECIES[this.species].breed;}
  get hungerRate(){return SPECIES[this.species].hunger;}
  get ready(){return this.#reproductionState<=0 && this.health>=50 && this.saturation>=42 && this.age>=12;}
  advance(){this.#reproductionState=Math.max(0,this.#reproductionState-1);this.age++;this.saturation=Math.max(0,this.saturation-this.hungerRate);}
  reproduce(){this.#reproductionState=SPECIES[this.species].breed;this.saturation-=20;}
  get vigor(){return (this.ready?150:0)+this.health-this.age/SPECIES[this.species].life*100;}
  save(){return [this.id,this.species,this.pos,this.age,this.health,this.saturation,this.#reproductionState];}
}
class Snail extends lifeform {} class Bird extends lifeform {} class Cat extends lifeform {}
class Wolf extends lifeform {} class Fish extends lifeform {} class Amphibian extends lifeform {} class Shark extends lifeform {}
const types=[Snail,Bird,Cat,Wolf,Fish,Amphibian,Shark];
const bucketWidth=24, columns=Math.ceil(SIZE/bucketWidth);
const bucket=p=>Math.floor(p%SIZE/bucketWidth)+columns*Math.floor(Math.floor(p/SIZE)/bucketWidth);

export class History {
  constructor(levels=[],width=2048){this.levels=levels;this.width=width;}
  add(tick,counts) {
    for(let i=0;i<18;i++) {
      const stride=4**i;
      if(tick%stride) break;
      const rows=this.levels[i]??=[];
      rows.push([tick,...counts]);
      if(rows.length>this.width+1) rows.shift();
    }
  }
  range(start,end,pixels) {
    const selected=new Map();
    // Fill historical gaps from coarser samples, preferring detailed recent counts.
    const stride=Math.max(1,(end-start)/pixels);
    const detail=Math.max(0,Math.floor(Math.log(stride)/Math.log(4)));
    for(let i=this.levels.length-1;i>=Math.min(detail,this.levels.length-1);i--) {
      for(const row of this.levels[i]) if(row[0]>=start&&row[0]<=end) selected.set(row[0],row);
    }
    return [...selected.values()].sort((a,b)=>a[0]-b[0]);
  }
}
export class Simulation {
  constructor(world,saved=null,historyWidth=2048) {
    this.world=world; this.random=rng(world.seed^872566);
    this.tick=saved?.tick??0;this.nextId=saved?.nextId??1;
    this.patches=new Map(saved?.patches);
    this.history=new History(saved?.history,Math.max(historyWidth,saved?.historyWidth||0));
    this.animals=[];this.cells=SPECIES.map(()=>new Map());this.buckets=SPECIES.map(()=>new Map());
    this.counts=Array(7).fill(0);
    if(saved){
      this.random.state=saved.random;
      for(const row of saved.animals) this.insert(new types[row[1]](...row));
    }else{
      this.seedPopulations();this.history.add(0,this.counts);
    }
  }
  rand(n){return Math.floor(this.random.next()*n);}
  index(a,add) {
    const cells=this.cells[a.species], groups=this.buckets[a.species], key=bucket(a.pos);
    if(add){
      cells.set(a.pos,a);
      if(!groups.has(key)) groups.set(key,new Set());
      groups.get(key).add(a);
    }else{
      cells.delete(a.pos);
      const group=groups.get(key);group.delete(a);if(!group.size) groups.delete(key);
    }
  }
  insert(a){this.animals.push(a);this.index(a,true);this.counts[a.species]++;}
  move(a,p){this.index(a,false);a.pos=p;this.index(a,true);}
  remove(a){this.index(a,false);a.health=0;this.counts[a.species]--;}
  spawn(s,p,initial=false){
    const spec=SPECIES[s], age=initial?this.rand(Math.floor(spec.life*.35)):0;
    this.insert(new types[s](this.nextId++,s,p,age,100,initial?55+this.rand(45):65,initial?this.rand(spec.breed):spec.breed));
  }
  seedPopulations(){
    for(let s=0;s<7;s++){
      const spec=SPECIES[s], goal=Math.round(spec.initial*(.91+.18*this.random.next()));
      let anchor=-1;
      const prey=spec.prey.flatMap(i=>Array.from(this.cells[i].values()));
      while(this.counts[s]<goal){
        let p;
        if(anchor>=0 && this.random.next()<.48) p=offset(anchor,this.rand(5)-2,this.rand(5)-2);
        else if(prey.length && this.random.next()<.62) p=offset(prey[this.rand(prey.length)].pos,this.rand(35)-17,this.rand(35)-17);
        else p=this.rand(CELLS);
        if(p<0 || this.cells[s].has(p) || !fits(s,this.world.terrain[p])) continue;
        if(s===5 && this.world.terrain[p]!==6 && this.random.next()<.75) continue;
        this.spawn(s,p,true);anchor=p;
      }
    }
  }
  fertility(p){
    const patch=this.patches.get(p);
    if(!patch) return this.world.capacity[p];
    if(patch[0]===0) return 0;
    return Math.min(this.world.capacity[p],patch[0]+Math.floor((this.tick-patch[1])/BIOMES[this.world.terrain[p]].recovery));
  }
  nearest(a,species,radius,eligible=()=>true) {
    const ax=a.pos%SIZE, ay=Math.floor(a.pos/SIZE), bx=Math.floor(ax/bucketWidth), by=Math.floor(ay/bucketWidth);
    let best=null, distance=radius*radius+1;
    const reach=Math.ceil(radius/bucketWidth);
    for(const s of species){
      for(let y=Math.max(0,by-reach);y<=Math.min(columns-1,by+reach);y++){
        for(let x=Math.max(0,bx-reach);x<=Math.min(columns-1,bx+reach);x++){
          const group=this.buckets[s].get(y*columns+x);
          if(!group) continue;
          for(const b of group){
            if(a===b || !eligible(b) || !fits(a.species,this.world.terrain[b.pos]))continue;
            const dx=b.pos%SIZE-ax,dy=Math.floor(b.pos/SIZE)-ay,d=dx*dx+dy*dy;
            if(d<distance || (d===distance && best && b.id<best.id)){best=b;distance=d;}
          }
        }
      }
    }
    return best;
  }
  travel(a) {
    const spec=SPECIES[a.species], hungry=a.saturation<72;
    let target;
    if(hungry && spec.prey.length) target=this.nearest(a,spec.prey,46);
    if(!target && a.ready) target=this.nearest(a,[a.species],25,b=>b.ready);
    let steps=Math.floor(a.movementSpeed+this.random.next());
    while(steps-->0){
      let dx,dy;
      if(target){
        dx=target.pos%SIZE-a.pos%SIZE;dy=Math.floor(target.pos/SIZE)-Math.floor(a.pos/SIZE);
        if(target.species===a.species && Math.abs(dx)<=1&&Math.abs(dy)<=1)break;
        if(dx===0&&dy===0)break;
        dx=Math.sign(dx);dy=Math.sign(dy);
      }else{
        if(!hungry&&!a.ready && this.random.next()<.76) break;
        [dx,dy]=dirs[this.rand(8)];
      }
      let p=offset(a.pos,dx,dy);
      if(p<0 || !fits(a.species,this.world.terrain[p]) || this.cells[a.species].has(p)){
        const dir=dirs[this.rand(8)];p=offset(a.pos,...dir);
      }
      if(p>=0&&fits(a.species,this.world.terrain[p])&&!this.cells[a.species].has(p))this.move(a,p);
    }
  }
  feed(a){
    if(a.saturation>=72)return;
    const spec=SPECIES[a.species];
    if(spec.prey.length){
      for(const s of spec.prey){
        const prey=this.cells[s].get(a.pos);
        if(prey){this.remove(prey);a.saturation=100;break;}
      }
    }else{
      const food=this.fertility(a.pos), eaten=Math.min(food,Math.ceil(100-a.saturation));
      if(eaten){this.patches.set(a.pos,[food-eaten,this.tick]);a.saturation=Math.min(100,a.saturation+eaten);}
    }
  }
  birth(parent,mate){
    const s=parent.species, cells=this.cells[s], start=this.rand(8), lines=[];
    for(let k=0;k<8;k++){
      const dir=dirs[(start+k)%8], p=offset(parent.pos,...dir);
      if(p<0||!fits(s,this.world.terrain[p]))continue;
      if(!cells.has(p)){this.spawn(s,p);parent.reproduce();mate.reproduce();return;}
      lines.push({p,dir,occupant:cells.get(p)});
    }
    lines.sort((a,b)=>a.occupant.vigor-b.occupant.vigor);
    for(const {p,dir} of lines){
      let end=p;const chain=[];
      while(end>=0 && fits(s,this.world.terrain[end]) && cells.has(end)){
        chain.push(cells.get(end));end=offset(end,...dir);
      }
      if(end<0||!fits(s,this.world.terrain[end])) continue;
      for(let k=chain.length-1;k>=0;k--){const old=chain[k].pos;this.move(chain[k],end);end=old;}
      this.spawn(s,p);parent.reproduce();mate.reproduce();return;
    }
  }
  step(){
    if(!this.animals.length)return false;
    this.tick++;
    const current=this.animals.slice();
    for(const a of current){a.advance();this.travel(a);}
    // End-of-tick feeding resolves predators before their prey can feed.
    for(const s of [3,6,2,5,1,4,0]){
      for(const a of this.cells[s].values()){
        this.feed(a);
        if(a.saturation===0)a.health-=3;
        else if(a.saturation>55)a.health=Math.min(100,a.health+1);
        if(a.health<=0 || a.age>=SPECIES[s].life)this.remove(a);
      }
    }
    for(const a of current){
      if(!a.ready||a.health<=0)continue;
      const start=this.rand(8);
      for(let i=0;i<8;i++){
        const other=this.cells[a.species].get(offset(a.pos,...dirs[(start+i)%8]));
        if(other?.ready){this.birth(a,other);break;}
      }
    }
    this.animals=this.animals.filter(a=>a.health>0);
    if(this.tick%96===0)this.prune();
    this.history.add(this.tick,this.counts);
    return true;
  }
  prune(){for(const p of this.patches.keys())if(this.fertility(p)===this.world.capacity[p])this.patches.delete(p);}
  save(){
    this.prune();
    return {tick:this.tick,nextId:this.nextId,random:this.random.state,animals:this.animals.map(a=>a.save()),patches:[...this.patches].sort((a,b)=>a[0]-b[0]),history:this.history.levels,historyWidth:this.history.width};
  }
}
