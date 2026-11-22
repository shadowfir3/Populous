import test from 'node:test';
import assert from 'node:assert/strict';
import {generateWorld,CELLS,SIZE} from '../dist/world.mjs';
import {Simulation,History} from '../dist/simulation.mjs';

const world=generateWorld(532179);
const empty=()=>new Simulation(world,{tick:0,nextId:1,random:42,animals:[],patches:[],history:[]});
const land=world.terrain.findIndex((b,i)=>b===2&&i>SIZE*2&&i%SIZE>5&&i%SIZE<SIZE-5&&world.terrain[i+1]===2);
const ready=(id,s,p,age=20)=>[id,s,p,age,100,85,0];

test('water stays below one fifth across seeds and the grid contains all seven biomes',()=>{
  for(const w of [world,generateWorld(721321),generateWorld(113),generateWorld(0)]){
    assert.equal(w.counts.reduce((a,b)=>a+b),CELLS);
    assert.ok(w.counts[6]<=CELLS/5);assert.ok(w.counts.every(n=>n>0));
  }
});
test('reloading a checkpoint produces the same subsequent population, locations and fertility',()=>{
  const sim=new Simulation(world);
  for(let i=0;i<90;i++)sim.step();
  const other=new Simulation(world,JSON.parse(JSON.stringify(sim.save())));
  for(let i=0;i<35;i++){sim.step();other.step();}
  assert.deepEqual(other.save(),sim.save());
  assert.equal(sim.counts.reduce((a,b)=>a+b),sim.animals.length);
  for(const a of sim.animals){
    assert.equal(sim.cells[a.species].get(a.pos),a);
    if(a.species!==5)assert.equal(world.terrain[a.pos]===6,a.species>=4);
  }
});
test('end-of-tick predation follows the food chain and habitat-specific grazing consumes fertility',()=>{
  const sim=empty();
  for(const s of [0,1,2,3])sim.spawn(s,land);
  for(const a of sim.animals)a.saturation=30;
  for(const s of [3,2,1,0]){
    const a=sim.cells[s].get(land);
    if(a)sim.feed(a);
  }
  assert.equal(sim.cells[2].size,0);assert.equal(sim.cells[0].size,0);
  assert.equal(sim.cells[3].get(land).saturation,100);assert.equal(sim.cells[1].get(land).saturation,100);
  sim.spawn(0,land);const snail=sim.cells[0].get(land);snail.saturation=70;sim.feed(snail);
  assert.equal(sim.fertility(land),world.capacity[land]-30);
  sim.tick+=40;assert.ok(sim.fertility(land)>world.capacity[land]-30);
  sim.patches.set(land,[2,sim.tick]);snail.saturation=30;sim.feed(snail);sim.tick+=1000;assert.equal(sim.fertility(land),0);
});
test('a birth in a crowded neighborhood displaces a neighbor and preserves unique occupancy',()=>{
  const pos=world.terrain.findIndex((b,i)=>b===2&&i%SIZE>3&&i%SIZE<SIZE-4&&i>3*SIZE&&[-2,-1,0,1,2].every(dx=>[-2,-1,0,1,2].every(dy=>world.terrain[i+dx+dy*SIZE]!==6)));
  const animals=[ready(1,0,pos,390)];let id=2;
  for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++)if(x||y)animals.push(ready(id++,0,pos+x+y*SIZE,370));
  const sim=new Simulation(world,{tick:1,nextId:id,random:2,animals,patches:[],history:[]});
  const parent=sim.animals[0],mate=sim.animals[1];sim.birth(parent,mate);
  assert.equal(sim.animals.length,10);assert.equal(sim.cells[0].size,10);
  assert.equal(parent.ready,false);assert.equal(mate.ready,false);
  assert.ok(Math.abs(sim.animals.at(-1).pos%SIZE-pos%SIZE)<=1);
  assert.ok(Math.abs(Math.floor(sim.animals.at(-1).pos/SIZE)-Math.floor(pos/SIZE))<=1);
});
test('history retains recent ticks, coarser older samples and the original population',()=>{
  const h=new History([],20);
  for(let tick=0;tick<400;tick++)h.add(tick,[tick,1,2,3,4,5,6]);
  assert.deepEqual(h.range(380,399,20).map(r=>r[0]),Array.from({length:20},(_,i)=>380+i));
  const old=h.range(0,399,15);assert.equal(old[0][0],0);assert.ok(old.length<80);
  assert.ok(h.levels.every(l=>l.length<=21));
});
test('an extinct world stops advancing',()=>{const sim=empty();assert.equal(sim.step(),false);assert.equal(sim.tick,0);});
