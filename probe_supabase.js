const names=['meal','daily_menu','daily_menu_items','daily_menu_food','daily_menu_options','meal_items','meal_food','food','menu_item','daily_menu_entry','daily_menu_day','menu','menu_type'];
const urlBase='https://mnupwxmiugokkzygqsnh.supabase.co/rest/v1/';
const headers={apikey:'sb_publishable_9VswbTFD0TPHomt7ESKoFQ_gMv_Ebrx', Authorization:'Bearer sb_publishable_9VswbTFD0TPHomt7ESKoFQ_gMv_Ebrx', accept:'application/json'};
(async ()=>{
  for(const name of names){
    try{
      const res=await fetch(urlBase+name+'?select=*',{headers, method:'GET'});
      const text=await res.text();
      console.log('TABLE',name,'status',res.status);
      console.log(text.slice(0,500));
    } catch(e){
      console.error('TABLE',name,'ERROR',e.message);
    }
  }
})();
