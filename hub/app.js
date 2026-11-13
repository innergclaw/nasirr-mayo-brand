(function(){
  var hub=document.getElementById('hub'),stage=document.getElementById('stage'),wires=document.getElementById('wires'),
      flood=document.getElementById('flood'),nodes=[].slice.call(document.querySelectorAll('.node'));
  var RM=window.matchMedia('(prefers-reduced-motion: reduce)');
  var OUT='cubic-bezier(0.16, 1, 0.3, 1)',INOUT='cubic-bezier(0.87, 0, 0.13, 1)';
  var GEO={
    land:{W:1920,H:1080,c:[960,540],r:125,pos:{top:[960,100],left:[520,540],right:[1400,540],bottom:[960,980]}},
    port:{W:1080,H:1920,c:[540,960],r:135,pos:{top:[540,625],left:[205,960],right:[875,960],bottom:[540,1295]}}
  };
  var order=['top','left','right','bottom'],current=null,busy=false;
  var NS='http://www.w3.org/2000/svg';

  function layout(){
    var W=hub.clientWidth||innerWidth,H=hub.clientHeight||innerHeight,port=W<H, g=port?GEO.port:GEO.land;
    document.body.classList.toggle('portrait',port);
    var s=Math.min(W/g.W,(H-(port?0:40))/g.H);
    stage.style.transform='scale('+s+') translate('+(-g.W/2)+'px,'+(-g.H/2)+'px)';
    wires.setAttribute('viewBox','0 0 '+g.W+' '+g.H);
    wires.innerHTML='<defs><filter id="bleed"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2"/><feDisplacementMap in="SourceGraphic" scale="6"/></filter></defs>';
    [g.r,g.r+12,g.r+20].forEach(function(r,i){
      var c=document.createElementNS(NS,'circle');c.setAttribute('cx',g.c[0]);c.setAttribute('cy',g.c[1]);c.setAttribute('r',r);
      c.setAttribute('stroke-width',i==0?7:3);var L=2*Math.PI*r;c.setAttribute('class','draw');
      c.style.cssText='stroke-dasharray:'+L+';--len:'+L+';--d:.6s;--dl:'+(0.15+i*0.06)+'s';wires.appendChild(c);
    });
    order.forEach(function(d,i){
      var p=g.pos[d],dx=p[0]-g.c[0],dy=p[1]-g.c[1],len=Math.hypot(dx,dy),ux=dx/len,uy=dy/len,st=g.r+24;
      var l=document.createElementNS(NS,'line');
      l.setAttribute('x1',g.c[0]+ux*st);l.setAttribute('y1',g.c[1]+uy*st);l.setAttribute('x2',p[0]);l.setAttribute('y2',p[1]);
      l.setAttribute('class','draw');l.dataset.dir=d;var LL=len-st;
      l.style.cssText='stroke-dasharray:'+LL+';--len:'+LL+';--d:.7s;--dl:'+(0.4+i*0.09)+'s';wires.appendChild(l);
      var n=nodes.filter(function(n){return n.dataset.dir==d})[0];
      n.style.left=p[0]+'px';n.style.top=p[1]+'px';
      n.style.setProperty('--in',(0.4+i*0.09+0.55)+'s');n.style.setProperty('--dur',(7+i*0.6)+'s');n.style.setProperty('--ph',(-i*1.9)+'s');
    });
  }
  function hot(n){
    nodes.forEach(function(x){x.classList.toggle('hot',x===n)});
    [].forEach.call(wires.querySelectorAll('line'),function(l){l.classList.toggle('on',!!n&&l.dataset.dir===n.dataset.dir)});
    hub.classList.toggle('focusing',!!n);
  }
  nodes.forEach(function(n){
    n.addEventListener('mouseenter',function(){hot(n)});
    n.addEventListener('mouseleave',function(){if(document.activeElement!==n)hot(null)});
    n.addEventListener('focus',function(){hot(n)});
    n.addEventListener('blur',function(){hot(null)});
    n.addEventListener('pointerdown',function(e){n._touch=e.pointerType==='touch'});
    n.addEventListener('click',function(e){
      if(n._touch&&!n.classList.contains('hot')){e.preventDefault();hot(n);return}
    });
  });
  function centerOf(branch){
    var n=nodes.filter(function(x){return x.dataset.branch===branch})[0];
    var r=n.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,r:r};
  }
  function anim(el,kf,opt){return el.animate(kf,Object.assign({fill:'forwards'},opt)).finished}
  function pageOf(b){return document.getElementById('page-'+b)}
  function showPage(pg){
    pg.hidden=false;[].forEach.call(pg.querySelectorAll('.rise'),function(e,i){e.style.setProperty('--i',i)});
    pg.classList.remove('enter');void pg.offsetWidth;pg.classList.add('enter');
  }
  function openBranch(b,instant){
    var pg=pageOf(b);if(!pg)return;busy=true;current=b;
    if(instant){hub.classList.add('gone');showPage(pg);busy=false;focusHome(pg);return}
    if(RM.matches){
      anim(hub,[{opacity:1},{opacity:0}],{duration:200}).then(function(){hub.classList.add('gone');showPage(pg);
        return anim(pg,[{opacity:0},{opacity:1}],{duration:200})}).then(function(){busy=false;focusHome(pg)});return;
    }
    var c=centerOf(b);
    var fr=flood.getBoundingClientRect();c={x:c.x-fr.left,y:c.y-fr.top,r:c.r};hub.style.transformOrigin=c.x+'px '+c.y+'px';var R=Math.hypot(Math.max(c.x,fr.width-c.x),Math.max(c.y,fr.height-c.y));
    anim(hub,[{transform:'scale(1)'},{transform:'scale(6)'}],{duration:700,easing:OUT});
    flood.style.opacity=1;
    anim(flood,[{clipPath:'circle('+c.r.height/2+'px at '+c.x+'px '+c.y+'px)'},{clipPath:'circle('+R+'px at '+c.x+'px '+c.y+'px)'}],{duration:700,easing:OUT});
    setTimeout(function(){
      showPage(pg);pg.style.zIndex=25;
      anim(pg,[{opacity:0},{opacity:1}],{duration:280,easing:OUT}).then(function(){
        flood.getAnimations().forEach(function(a){a.cancel()});flood.style.opacity=0;
        hub.classList.add('gone');pg.style.zIndex='';busy=false;focusHome(pg);
      });
    },420);
  }
  function focusHome(pg){var h=pg.querySelector('.home');h&&h.focus({preventScroll:true})}
  function goHome(instant){
    var pg=current&&pageOf(current),b=current;current=null;
    hub.getAnimations().forEach(function(a){a.cancel()});hub.style.opacity='';
    hub.classList.remove('loading');hub.classList.remove('gone');hot(null);
    if(!pg||instant){if(pg)pg.hidden=true;return}
    busy=true;var c=centerOf(b);
    var done=function(){busy=false;var n=nodes.filter(function(x){return x.dataset.branch===b})[0];n&&n.focus({preventScroll:true})};
    if(RM.matches){pg.style.zIndex=25;anim(pg,[{opacity:1},{opacity:0}],{duration:200}).then(function(){pg.hidden=true;pg.style.zIndex='';pg.getAnimations().forEach(function(a){a.cancel()});done()});return}
    var hr=hub.getBoundingClientRect();hub.style.transformOrigin=(c.x-hr.left)+'px '+(c.y-hr.top)+'px';
    hub.animate([{transform:'scale(6)'},{transform:'scale(6)'}],{duration:1,fill:'forwards'});
    pg.style.zIndex=25;var pr=pg.getBoundingClientRect();pg.style.transformOrigin=(c.x-pr.left)+'px '+(c.y-pr.top)+'px';
    anim(pg,[{transform:'scale(1)',opacity:1},{transform:'scale(.08)',opacity:0}],{duration:450,easing:INOUT}).then(function(){
      pg.hidden=true;pg.style.zIndex='';pg.getAnimations().forEach(function(a){a.cancel()});
      hub.getAnimations().forEach(function(a){a.cancel()});
      return anim(hub,[{transform:'scale(6)'},{transform:'scale(1)'}],{duration:800,easing:INOUT});
    }).then(function(){hub.getAnimations().forEach(function(a){a.cancel()});done()});
  }
  function route(first){
    var b=location.hash.replace('#','');
    if(b&&pageOf(b)){if(b!==current){if(current){pageOf(current).hidden=true;current=null}openBranch(b,first)}}
    else if(current){goHome(first)}
  }
  [].forEach.call(document.querySelectorAll('.home'),function(h){
    h.addEventListener('click',function(e){e.preventDefault();if(busy)return;history.pushState(null,'',location.pathname+location.search);goHome(false)});
  });
  window.addEventListener('hashchange',function(){route(false)});
  window.addEventListener('popstate',function(){if(!location.hash)route(false)});
  window.addEventListener('resize',layout);
  layout();
  if(!RM.matches&&matchMedia('(pointer:fine)').matches){var raf=0;document.addEventListener('pointermove',function(e){if(raf)return;raf=requestAnimationFrame(function(){raf=0;
    var x=(e.clientX/innerWidth-.5)*2,y=(e.clientY/innerHeight-.5)*2,r=document.documentElement.style;
    r.setProperty('--px',(x*4).toFixed(2)+'px');r.setProperty('--py',(y*3).toFixed(2)+'px')})})}
  if(!location.hash&&!RM.matches)hub.classList.add('loading');
  route(true);
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&current&&!busy){history.pushState(null,'',location.pathname);goHome(false)}});
})();
