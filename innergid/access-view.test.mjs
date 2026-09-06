import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { renderAccessView } from "./access-view.mjs";
function page() {
  const nodes = new Map();
  const offers = [{hidden:false},{hidden:false},{hidden:false}];
  return {
    documentElement:{dataset:{}},
    querySelectorAll:()=>offers,
    querySelector(selector) {
      if(!nodes.has(selector)) nodes.set(selector,{hidden:false,textContent:"",dataset:{},scrollIntoView(){},removeAttribute(key){delete this[key];}});
      return nodes.get(selector);
    },
    offers,
  };
}
for(const state of ["loading","active","public","error"]) {
  test(state+" shows only its intended view",()=>{
    const root=page();
    renderAccessView(root,state);
    assert.equal(root.offers.every(node=>node.hidden),state!=="public");
    assert.equal(root.querySelector("#member-panel").hidden,state!=="active");
    assert.equal(root.querySelector("#access-loading").hidden,["active","public"].includes(state));
    assert.equal(root.querySelector("#access-retry").hidden,state!=="error");
    if(state==="active") assert.equal(root.querySelector(".account-link").href,"../innerg-id/");
  });
}
const source=await readFile(new URL("./innergid.js",import.meta.url),"utf8");
const start=source.indexOf("const showMember = async");
const end=source.indexOf('document.querySelector("#access-retry")',start);
function flow(invoke){
  const document=page();
  const context={document,renderAccessView,supabase:{functions:{invoke}},panel:document.querySelector("#member-panel"),
    number:document.querySelector("#member-number"),status:document.querySelector("#member-status"),
    discord:document.querySelector("#discord-link"),purchase:document.querySelector(".purchase-action"),
    history:{replaceState(){}},location:{pathname:"/innergid/"}};
  vm.createContext(context);
  vm.runInContext("let activeSession=null;let accessRequest=0;let displayedMember=null;"+source.slice(start,end)+";this.showMember=showMember;",context);
  return {...context,document};
}
test("verified member sees number without any purchase section",async()=>{
 const f=flow(async()=>({data:{membershipNumber:"TEST-CARD",discordUrl:"https://discord.gg/test"},error:null}));
 await f.showMember({user:{id:"test"}});
 assert.equal(f.document.documentElement.dataset.accessView,"active");
 assert.equal(f.number.textContent,"TEST-CARD");
 assert.ok(f.document.offers.every(x=>x.hidden));
});
test("signed-in unpaid account still requires payment",async()=>{
 const f=flow(async()=>({data:null,error:{context:{status:403}}}));
 await f.showMember({user:{id:"test"}});
 assert.equal(f.document.documentElement.dataset.accessView,"public");
 assert.equal(f.panel.hidden,true);
});
test("server failure does not send an existing member to checkout",async()=>{
 const f=flow(async()=>{throw Error("network")});
 await f.showMember({user:{id:"test"}});
 assert.equal(f.document.documentElement.dataset.accessView,"error");
});
test("sign-out discards a late member response and clears member details",async()=>{
 let resolve;
 const f=flow(()=>new Promise(done=>{resolve=done}));
 const pending=f.showMember({user:{id:"test"}});
 await f.showMember(null);
 resolve({data:{membershipNumber:"STALE"},error:null});
 await pending;
 assert.equal(f.document.documentElement.dataset.accessView,"public");
 assert.equal(f.number.textContent,"");
 assert.equal(f.panel.hidden,true);
});
