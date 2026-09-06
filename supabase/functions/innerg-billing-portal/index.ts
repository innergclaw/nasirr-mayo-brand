import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@22.6.1";
import {createClient} from "npm:@supabase/supabase-js@2.112.4";
Deno.serve(async(req:Request)=>{
 const headers={"Access-Control-Allow-Origin":"https://nasirr.innergintel.org","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Cache-Control":"private, no-store"};
 const reply=(data:unknown,status=200)=>Response.json(data,{status,headers});
 if(req.method==="OPTIONS") return new Response("ok",{headers});
 if(req.method!=="POST") return reply({error:"Method not allowed"},405);
 try{
 const auth=req.headers.get("Authorization")??"";
 const url=Deno.env.get("SUPABASE_URL")!;
 const client=createClient(url,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:auth}}});
 const {data:{user},error}=await client.auth.getUser(auth.replace(/^Bearer\s+/i,""));
 if(error||!user)return reply({error:"Sign in to manage billing."},401);
 const service=createClient(url,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
 const {data:member,error:readError}=await service.from("innerg_memberships").select("stripe_customer_id").eq("user_id",user.id).maybeSingle();
 if(readError)throw readError;
 if(!member?.stripe_customer_id)return reply({error:"No Stripe billing account is connected. Contact ownyourwebsmm@gmail.com."},404);
 const stripe=new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);
 const session=await stripe.billingPortal.sessions.create({customer:member.stripe_customer_id,return_url:"https://nasirr.innergintel.org/innerg-id/"});
 return reply({url:session.url});
 }catch{return reply({error:"Billing could not open. Contact ownyourwebsmm@gmail.com."},502);}
});
