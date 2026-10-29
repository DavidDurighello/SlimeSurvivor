import {WIDTH as W, HEIGHT as H} from './engine.mjs';
const colors=['#91dc83','#73c8ed','#bd8be9'];
export class Renderer {
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');canvas.width=W*2;canvas.height=H*2;this.ctx.scale(2,2);}
 ellipse(x,y,rx,ry,fill){const c=this.ctx;c.fillStyle=fill;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
 line(x1,y1,x2,y2,color,width=2){const c=this.ctx;c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();}
 slime(e,t){
 const c=this.ctx; const bounce=Math.sin(e.phase||t*4);const squash=e.warning>0?0.8:1+bounce*0.08;
 this.ellipse(e.x,e.y+e.r*.7,e.r*1.06,e.r*.3,'#0b111742');
 c.save();c.translate(e.x,e.y);c.scale(1/squash,squash);
 c.beginPath();c.moveTo(-e.r,e.r*.5);c.bezierCurveTo(-e.r*1.2,-e.r*.45,-e.r*.55,-e.r,e.r*.05,-e.r);c.bezierCurveTo(e.r*.85,-e.r,e.r*1.12,e.r*.2,e.r,e.r*.5);c.quadraticCurveTo(0,e.r,-e.r,e.r*.5);
 c.fillStyle=e.flash>0?'#fff':colors[e.type];c.fill();c.strokeStyle='#132e36';c.lineWidth=e.boss?4:2;c.stroke();
 this.ellipse(-e.r*.38,-e.r*.38,e.r*.22,e.r*.1,'#ffffff65');
 for(const side of [-1,1]) {this.ellipse(side*e.r*.32,-e.r*.02,e.r*.13,e.r*.18,'#17282f');this.ellipse(side*e.r*.32+1,-e.r*.08,e.r*.035,e.r*.05,'#fff');}
 this.line(-e.r*.12,e.r*.3,e.r*.12,e.r*.3,'#17282f',e.boss?4:2);
 if(e.type===1){for(const side of [-1,1])this.line(side*e.r*.6,-e.r*.65,side*e.r*.4,-e.r*1.3,'#ddf6ff',3);}
 if(e.type===2){c.fillStyle='#8756a8';for(const side of [-1,1]){c.beginPath();c.moveTo(side*e.r*.7,-e.r*.35);c.lineTo(side*e.r*.7,-e.r*1.15);c.lineTo(side*e.r*.2,-e.r*.75);c.fill();}}
 if(e.boss){c.fillStyle='#ffca67';c.strokeStyle='#47332c';c.lineWidth=2;c.beginPath();c.moveTo(-22,-e.r+3);c.lineTo(-27,-e.r-20);c.lineTo(-10,-e.r-12);c.lineTo(0,-e.r-30);c.lineTo(10,-e.r-12);c.lineTo(27,-e.r-20);c.lineTo(22,-e.r+3);c.closePath();c.fill();c.stroke();}
 c.restore();
 if(e.hp<e.maxHp && !e.boss){c.fillStyle='#15232b';c.fillRect(e.x-e.r,e.y-e.r-9,e.r*2,3);c.fillStyle='#ffb76d';c.fillRect(e.x-e.r,e.y-e.r-9,e.r*2*Math.max(0,e.hp/e.maxHp),3);}
 if(e.burn>0)this.ellipse(e.x+e.r*.6,e.y-e.r*.8,4,8,'#ffb75e');
 if(e.fragile>0){c.strokeStyle='#f7e3ff';c.lineWidth=2;c.strokeRect(e.x-e.r-3,e.y-e.r-3,e.r*2+6,e.r*2+6);}
 }
 hero(x,y,t,moving=false,inv=false,large=false){
 const c=this.ctx;c.save();c.translate(x,y);if(large)c.scale(2.5,2.5);if(inv)c.globalAlpha=.5+Math.sin(t*50)*.3;
 const step=moving?Math.sin(t*16)*4:Math.sin(t*3)*1.1;
 this.ellipse(0,23,23,7,'#09141a55');
 this.line(-8,12,-10,24+step,'#182d3e',9);this.line(8,12,10,24-step,'#182d3e',9);
 this.line(-14,25+step,-6,25+step,'#e9ebd8',6);this.line(6,25-step,14,25-step,'#e9ebd8',6);
 this.ellipse(0,-1,18,20,'#f1ab75');
 this.ellipse(-19,-8,12,11,'#f8bf89');this.ellipse(19,-8,12,11,'#f8bf89');
 this.ellipse(-24,3+step*.4,9,10,'#eaa06f');this.ellipse(24,3-step*.4,9,10,'#eaa06f');
 this.line(-19,-11,-12,-5,'#d58c62',2);this.line(19,-11,12,-5,'#d58c62',2);
 c.fillStyle='#e86444';c.beginPath();c.moveTo(-10,-15);c.lineTo(-7,9);c.lineTo(7,9);c.lineTo(10,-15);c.lineTo(5,-9);c.lineTo(-5,-9);c.fill();
 c.fillStyle='#243b4a';c.fillRect(-14,9,28,8);this.line(0,10,0,17,'#142a36',2);
 this.ellipse(0,-24,10,12,'#f8bf89');
 c.fillStyle='#483527';c.beginPath();c.arc(0,-29,10,Math.PI,Math.PI*2);c.lineTo(10,-26);c.lineTo(-10,-27);c.fill();
 this.line(-10,-28,10,-28,'#e86444',4);
 this.line(-6,-23,-2,-23,'#172c35',2);this.line(2,-23,6,-23,'#172c35',2);
 this.line(-4,-17,4,-17,'#fff4d9',2);
 c.restore();
 }
 draw(game,t,moving){
 const c=this.ctx;c.clearRect(0,0,W,H);
 c.fillStyle='#d4d8bb';c.fillRect(0,0,W,H);
 // Rubber gym tiles, painted court and worn floor markings.
 c.strokeStyle='#bcc5aa';c.lineWidth=1;
 for(let x=0;x<W;x+=44){c.beginPath();c.moveTo(x,0);c.lineTo(x,H);c.stroke();}
 for(let y=0;y<H;y+=44){c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke();}
 c.strokeStyle='#f7f3d780';c.lineWidth=3;c.strokeRect(38,45,W-76,H-90);
 c.beginPath();c.arc(W/2,H/2,90,0,Math.PI*2);c.stroke();c.beginPath();c.moveTo(38,H/2);c.lineTo(W-38,H/2);c.stroke();
 c.save();c.translate(W/2,H/2);c.rotate(-Math.PI/2);c.fillStyle='#a4b19960';c.font='900 50px sans-serif';c.textAlign='center';c.fillText('NO REST DAYS',0,17);c.restore();
 c.fillStyle='#3b5052';c.fillRect(0,0,W,11);c.fillRect(0,H-11,W,11);c.fillRect(0,0,11,H);c.fillRect(W-11,0,11,H);
 for(let y=28;y<H;y+=55){c.fillStyle='#ffd580';c.fillRect(2,y,6,18);c.fillRect(W-8,y,6,18);}
 for(let x of [65,W-65]){this.line(x-20,25,x+20,25,'#526363',5);for(let s of [-1,1])this.line(x+s*14,17,x+s*14,33,'#647774',8);}
 if(!game){this.hero(W/2,H/2+30,t,false,false,true);for(let i=0;i<5;i++)this.slime({x:60+i*80,y:530+Math.sin(i)*22,r:18+i*2,type:i%3,phase:t*4+i},t);return;}
 for(const e of game.enemies){if(e.warning>0){c.strokeStyle='#de5e4b';c.fillStyle='#ef75553a';c.lineWidth=3;c.setLineDash([7,5]);if(e.boss){c.beginPath();c.arc(e.x,e.y,145,0,Math.PI*2);c.fill();c.stroke();}else{this.line(e.x,e.y,e.targetX,e.targetY,'#df665d85',24);c.strokeStyle='#de5e4b';c.strokeRect(e.targetX-15,e.targetY-15,30,30);}c.setLineDash([]);}}
 for(const d of game.drops){c.globalAlpha=d.life/.6;this.ellipse(d.x,d.y,7,5,colors[d.color]);if(d.gear)this.ellipse(d.x+10,d.y-5,4,6,'#ffc66d');}c.globalAlpha=1;
 const sorted=[...game.enemies,{...game.player,hero:true}].sort((a,b)=>a.y-b.y);
 for(const e of sorted){if(e.hero)this.hero(e.x,e.y,t,moving,game.player.inv>0);else this.slime(e,t);}
 for(const s of game.shots){c.save();c.translate(s.x,s.y);c.rotate(s.angle);if(s.shaker){c.fillStyle='#f4f2da';c.fillRect(-7,-11,14,21);c.fillStyle='#e57a4f';c.fillRect(-8,-14,16,5);c.fillStyle='#96d87e';c.fillRect(-5,0,10,8);}else{this.ellipse(0,0,12,12,'#667195');this.ellipse(0,0,8,8,'#aab7d3');this.ellipse(0,0,3,3,'#3c4d61');}c.restore();}
 for(const f of game.effects){const progress=1-f.life/f.max;c.globalAlpha=1-progress;c.strokeStyle=f.color;c.fillStyle=f.color;c.lineWidth=5*(1-progress)+1;
 if(f.kind==='swing'){c.save();c.translate(f.x,f.y);c.rotate(f.seed);c.beginPath();c.arc(0,0,f.size*(.7+progress*.3),-1.1,1.1);c.lineWidth=18*(1-progress);c.stroke();const a=-1+progress*2;const x=Math.cos(a)*75,y=Math.sin(a)*75;this.line(x-13,y,x+13,y,'#34465a',6);this.line(x-14,y-8,x-14,y+8,'#66738c',9);this.line(x+14,y-8,x+14,y+8,'#66738c',9);c.restore();}
 else if(f.kind==='ring'||f.kind==='nova'){c.beginPath();c.arc(f.x,f.y,Math.max(1,f.size*progress),0,Math.PI*2);c.stroke();if(f.kind==='nova'){c.globalAlpha=(1-progress)*.15;c.fill();}}
 else {for(let i=0;i<7;i++){const angle=i/7*Math.PI*2+f.seed;const radius=f.size*progress;this.ellipse(f.x+Math.cos(angle)*radius,f.y+Math.sin(angle)*radius,Math.max(1,5*(1-progress)),Math.max(1,3*(1-progress)),f.color);}}
 }c.globalAlpha=1;
 c.textAlign='center';c.font='900 14px sans-serif';
 for(const f of game.texts){c.globalAlpha=Math.min(1,f.life*2);c.fillStyle='#253c40';c.fillText(f.text,f.x+1,f.y-(.85-f.life)*35+1);c.fillStyle=f.color;c.fillText(f.text,f.x,f.y-(.85-f.life)*35);}c.globalAlpha=1;
 }
}
