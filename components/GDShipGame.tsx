import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, Easing, Image, Modal, PanResponder, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, G, Line, Polygon } from "react-native-svg";

import Text from "@/components/ui/AppText";
import LiquidGlassView from "@/components/ui/LiquidGlassView";
import { useTheme } from "@/contexts/ThemeContext";
import { hapticsImpact } from "@/utils/haptics";
import { consumePendingShipTaskBonus, SHIP_CREDITS_KEY, SHIP_EQUIPPED_KEY, SHIP_HIGH_SCORE_KEY, SHIP_OWNED_KEY } from "@/utils/shipEconomy";

type ShipId="default"|"turboprop"|"jet"|"bomber"|"airliner"|"interceptor"|"scout"|"fighter"|"stealth"|"gunship"|"maxwell";
type Ability="none"|"rearGun"|"hunter"|"flares"|"gunFlares"|"scoutFlares"|"fighter"|"stealth"|"gunship";
type Ship={id:ShipId;name:string;price:number;speed:number;accel:number;ability:Ability;description:string};
type Upgrades={jetCooldown:number;jetDamage:number;jetSpeed:number;nitroOwned:Partial<Record<ShipId,boolean>>};
type Missile={id:number;x:number;y:number;vx:number;vy:number;age:number;rotation:number;elite:boolean;hp:number;nearMissed:boolean};
type Shot={id:number;x:number;y:number;vx:number;vy:number;age:number;damage:number;kind:"front"|"rear"|"hunter";targetId?:number};
type BossBullet={id:number;x:number;y:number;vx:number;vy:number;age:number};
type Flare={id:number;x:number;y:number;vx:number;vy:number;expiresAt:number};
type Explosion={id:number;x:number;y:number;bornAt:number;power:number};
type Boss={id:1|2|3|4;name:string;x:number;y:number;vx:number;vy:number;hp:number;maxHp:number;nextShot:number;nextRam:number;ram:"idle"|"windup"|"dash"|"return";phaseAt:number;targetX:number;targetY:number};
type Scene={plane:{x:number;y:number};heading:number;camera:{x:number;y:number};missiles:Missile[];shots:Shot[];bossBullets:BossBullet[];flares:Flare[];explosions:Explosion[];trail:{x:number;y:number}[];elapsed:number;health:number;boss:Boss|null;frontCd:number;rearCd:number;seekCd:number;flareCd:number;nitroCd:number;nitro:boolean;ace:number;shield:boolean;complete:boolean};

const UPGRADE_KEY="ta_plus_ship_upgrades_v3";
const BOSS_KILLS_KEY="ta_plus_ship_boss_kills_lifetime";
const DEFAULT_UPGRADES:Upgrades={jetCooldown:0,jetDamage:0,jetSpeed:0,nitroOwned:{}};
const FRONT_CD=[3,2.5,2,1.5], FRONT_DAMAGE=[1,2,3,4], SPEED_BONUS=[0,5,10,15,20];
const SCENE_PUBLISH_MS=__DEV__?32:24;
const CD_COST=[300,700,1400], DMG_COST=[450,1000,1800], SPD_COST=[250,500,900,1400], NITRO_PRICE=300;
const SHIPS:Ship[]=[
{id:"default",name:"Default",price:0,speed:142,accel:6.2,ability:"none",description:"Balanced starter aircraft."},
{id:"turboprop",name:"Turboprop",price:100,speed:178,accel:6.5,ability:"none",description:"Fast propeller aircraft."},
{id:"scout",name:"Scout",price:500,speed:120,accel:6.0,ability:"scoutFlares",description:"Light airliner variant with compact flares."},
{id:"jet",name:"Jet",price:1000,speed:222,accel:7.2,ability:"rearGun",description:"Fast combat aircraft."},
{id:"bomber",name:"Bomber",price:2000,speed:174,accel:5.9,ability:"hunter",description:"Counter-missile aircraft."},
{id:"airliner",name:"Airliner",price:3500,speed:166,accel:5.8,ability:"flares",description:"Large defensive aircraft."},
{id:"stealth",name:"Stealth",price:4000,speed:205,accel:7.0,ability:"stealth",description:"Dual-direction flares and automatic evasive boosts."},
{id:"fighter",name:"Fighter",price:4400,speed:232,accel:7.6,ability:"fighter",description:"Twin seekers with an unrestricted rear gun."},
{id:"interceptor",name:"Interceptor",price:5000,speed:246,accel:7.8,ability:"gunFlares",description:"Fastest normal defensive aircraft."},
{id:"gunship",name:"Gunship",price:10000,speed:238,accel:6.8,ability:"gunship",description:"Heavy endgame aircraft. Requires 4 lifetime boss defeats."},
{id:"maxwell",name:"Maxwell",price:0,speed:198,accel:6.9,ability:"none",description:"A hidden upgraded turboprop."},
]
const BOSSES=[
{id:1 as const,name:"Boss 1",delay:30,hp:8,shot:1.8,spread:1,bullet:150,follow:2.4,ram:false,reward:120},
{id:2 as const,name:"Boss 2",delay:60,hp:14,shot:1.45,spread:3,bullet:165,follow:2.8,ram:true,reward:300},
{id:3 as const,name:"Boss 3",delay:120,hp:22,shot:1.1,spread:5,bullet:180,follow:3.2,ram:true,reward:700},
{id:4 as const,name:"Boss 4",delay:300,hp:34,shot:.85,spread:7,bullet:195,follow:3.6,ram:false,reward:1800},
]
const SPRITES:Record<Exclude<ShipId,"maxwell">,any>={
default:require("../assets/planes/default.png"),turboprop:require("../assets/planes/turboprop.png"),
jet:require("../assets/planes/jet.png"),bomber:require("../assets/planes/bomber.png"),
airliner:require("../assets/planes/airliner.png"),interceptor:require("../assets/planes/interceptor.png"),
scout:require("../assets/planes/scout.png"),fighter:require("../assets/planes/fighter.png"),
stealth:require("../assets/planes/stealth.png"),gunship:require("../assets/planes/gunship.png"),
};
const BOSS_SPRITES={1:require("../assets/bosses/boss1.png"),2:require("../assets/bosses/boss2.png"),3:require("../assets/bosses/boss3.png"),4:require("../assets/bosses/boss3.png")} as const;
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const dist=(ax:number,ay:number,bx:number,by:number)=>Math.hypot(ax-bx,ay-by);
const norm=(x:number,y:number)=>{const l=Math.hypot(x,y);return l<.0001?{x:1,y:0}:{x:x/l,y:y/l}};

function Spinner({accent,size}:{accent:string;size:number}){
 const spin=useRef(new Animated.Value(0)).current;
 useEffect(()=>{const a=Animated.loop(Animated.timing(spin,{toValue:1,duration:390,easing:Easing.linear,useNativeDriver:true}));a.start();return()=>a.stop()},[spin]);
 return <Animated.View pointerEvents="none" style={{position:"absolute",top:size*.02,left:size*.5-1.5,width:3,height:size*.24,borderRadius:2,backgroundColor:accent,transform:[{rotate:spin.interpolate({inputRange:[0,1],outputRange:["0deg","360deg"]})}]}}/>;
}
function Plane({id,accent,size}:{id:ShipId;accent:string;size:number}){
 if(id==="maxwell")return <View style={{width:size,height:size,alignItems:"center",justifyContent:"center"}}><Image source={require("../assets/images/maxwell.png")} resizeMode="contain" fadeDuration={0} style={{width:size*.76,height:size*.76,tintColor:accent}}/><Spinner accent={accent} size={size}/></View>;
 return <View style={{width:size,height:size,alignItems:"center",justifyContent:"center"}}><Image source={SPRITES[id]} resizeMode="contain" fadeDuration={0} style={{width:size,height:size,tintColor:accent}}/>{id==="turboprop"?<Spinner accent={accent} size={size}/>:null}</View>;
}
function BossSprite({id,accent,size}:{id:1|2|3|4;accent:string;size:number}){
 return <View style={{width:size,height:size,alignItems:"center",justifyContent:"center"}}><Image source={BOSS_SPRITES[id]} resizeMode="contain" fadeDuration={0} style={{width:size,height:size,tintColor:accent}}/>{id===4?<View style={{position:"absolute",width:size*.92,height:size*.92,borderRadius:size,borderWidth:2,borderColor:accent,opacity:.55}}/>:null}</View>;
}

export default function GDShipGame({maxwellUnlocked}:{maxwellUnlocked:boolean}){
 const {activeTone,isDark}=useTheme(), text=isDark?"#edebea":"#2f3035";
 const [screen,setScreen]=useState<"menu"|"store"|"encyclopedia"|"game">("menu"),[tab,setTab]=useState<"aircraft"|"upgrades">("aircraft");
 const [credits,setCredits]=useState(0),[owned,setOwned]=useState<ShipId[]>(["default"]),[equipped,setEquipped]=useState<ShipId>("default"),[best,setBest]=useState(0),[fullscreen,setFullscreen]=useState(false),[bossKills,setBossKills]=useState(0);
 const [upgrades,setUpgrades]=useState<Upgrades>(DEFAULT_UPGRADES),[lastRun,setLastRun]=useState<{seconds:number;earned:number}|null>(null),[bonus,setBonus]=useState<number|null>(null);

 const load=async()=>{const [c,o,e,b,u,k]=await Promise.all([AsyncStorage.getItem(SHIP_CREDITS_KEY),AsyncStorage.getItem(SHIP_OWNED_KEY),AsyncStorage.getItem(SHIP_EQUIPPED_KEY),AsyncStorage.getItem(SHIP_HIGH_SCORE_KEY),AsyncStorage.getItem(UPGRADE_KEY),AsyncStorage.getItem(BOSS_KILLS_KEY)]);
   const cn=Number(c);if(Number.isFinite(cn))setCredits(Math.max(0,Math.floor(cn)));
   if(o)try{const p=JSON.parse(o);if(Array.isArray(p))setOwned(Array.from(new Set<ShipId>(["default",...p.filter((x:any)=>SHIPS.some(s=>s.id===x))])))}catch{}
   if(e&&SHIPS.some(s=>s.id===e))setEquipped(e as ShipId);const bn=Number(b);if(Number.isFinite(bn))setBest(bn);
   if(u)try{const p=JSON.parse(u);setUpgrades({jetCooldown:clamp(Number(p.jetCooldown)||0,0,3),jetDamage:clamp(Number(p.jetDamage)||0,0,3),jetSpeed:clamp(Number(p.jetSpeed)||0,0,4),nitroOwned:p.nitroOwned||{}})}catch{}
   const kn=Number(k);if(Number.isFinite(kn))setBossKills(Math.max(0,Math.floor(kn)));
 };
 useEffect(()=>{load().catch(()=>{});consumePendingShipTaskBonus().then(v=>{if(v>0){setBonus(v);setTimeout(()=>setBonus(null),4200)}}).catch(()=>{})},[]);
 useEffect(()=>{if(!maxwellUnlocked)return;setOwned(cur=>{if(cur.includes("maxwell"))return cur;const n=[...cur,"maxwell" as ShipId];AsyncStorage.setItem(SHIP_OWNED_KEY,JSON.stringify(n)).catch(()=>{});return n})},[maxwellUnlocked]);

 const ship=SHIPS.find(s=>s.id===equipped)||SHIPS[0];
 const persistU=async(n:Upgrades)=>{setUpgrades(n);await AsyncStorage.setItem(UPGRADE_KEY,JSON.stringify(n))};
 const spend=async(p:number)=>{if(credits<p){Alert.alert("Not enough credits",`You need $${p.toLocaleString()}.`);return false}const n=credits-p;setCredits(n);await AsyncStorage.setItem(SHIP_CREDITS_KEY,String(n));return true};
 const buyShip=async(s:Ship)=>{if(owned.includes(s.id)){setEquipped(s.id);await AsyncStorage.setItem(SHIP_EQUIPPED_KEY,s.id);return}if(s.id==="gunship"&&bossKills<4){Alert.alert("Gunship Locked",`Defeat ${4-bossKills} more boss${4-bossKills===1?"":"es"} across any runs first.`);return}if(!(await spend(s.price)))return;const n=Array.from(new Set<ShipId>([...owned,s.id]));setOwned(n);setEquipped(s.id);await Promise.all([AsyncStorage.setItem(SHIP_OWNED_KEY,JSON.stringify(n)),AsyncStorage.setItem(SHIP_EQUIPPED_KEY,s.id)])};
 const buyUpgrade=async(k:"cooldown"|"damage"|"speed")=>{const l=k==="cooldown"?upgrades.jetCooldown:k==="damage"?upgrades.jetDamage:upgrades.jetSpeed,c=k==="cooldown"?CD_COST:k==="damage"?DMG_COST:SPD_COST;if(l>=c.length||!(await spend(c[l])))return;await persistU({...upgrades,jetCooldown:k==="cooldown"?l+1:upgrades.jetCooldown,jetDamage:k==="damage"?l+1:upgrades.jetDamage,jetSpeed:k==="speed"?l+1:upgrades.jetSpeed})};
 const buyNitro=async(id:ShipId)=>{if(upgrades.nitroOwned[id]||!(await spend(NITRO_PRICE)))return;await persistU({...upgrades,nitroOwned:{...upgrades.nitroOwned,[id]:true}})};
 const finish=async(seconds:number)=>{const earned=Math.floor(seconds*3),raw=Number(await AsyncStorage.getItem(SHIP_CREDITS_KEY)),base=Number.isFinite(raw)?raw:credits,next=base+earned,nb=Math.max(best,seconds);setCredits(next);setBest(nb);setLastRun({seconds,earned});await Promise.all([AsyncStorage.setItem(SHIP_CREDITS_KEY,String(next)),AsyncStorage.setItem(SHIP_HIGH_SCORE_KEY,String(nb))])};

 if(screen==="game"){const leave=()=>{load().catch(()=>{});setScreen("menu")};const node=<Flight ship={ship} upgrades={upgrades} fullscreen={fullscreen} best={best} onFinish={finish} onExit={leave}/>;return fullscreen?<Modal visible animationType="fade" presentationStyle="fullScreen" onRequestClose={leave}>{node}</Modal>:node}
 if(screen==="encyclopedia")return <ScrollView contentContainerStyle={S.menu}><Top credits={credits} onBack={()=>setScreen("menu")}/><Text style={[S.title,{color:text}]}>Boss Encyclopedia</Text><View style={S.bossGrid}>{BOSSES.map(b=><LiquidGlassView key={b.id} containerClassName="w-[48%]" className="rounded-2xl overflow-hidden" fallbackBackgroundColor={activeTone.bg3} glassTintColor={activeTone.bg2} glassEffectStyle="clear"><View style={S.bossCard}><BossSprite id={b.id} accent={activeTone.accent} size={b.id===4?105:88}/><Text style={[S.bossName,{color:text}]}>{b.name}</Text></View></LiquidGlassView>)}</View></ScrollView>;
 if(screen==="store"){const vis=SHIPS.filter(s=>s.id!=="maxwell"||maxwellUnlocked);return <ScrollView contentContainerStyle={S.menu}><Top credits={credits} onBack={()=>setScreen("menu")}/><View style={S.tabs}>{(["aircraft","upgrades"] as const).map(x=><Pressable key={x} onPress={()=>setTab(x)} style={[S.tab,{backgroundColor:tab===x?activeTone.accent:activeTone.bg3,borderColor:tab===x?activeTone.accent:activeTone.border}]}><Text style={{color:tab===x?(isDark?"#111113":"#fff"):text,fontWeight:"900"}}>{x==="aircraft"?"Aircraft":"Upgrades"}</Text></Pressable>)}</View>
 {tab==="aircraft"?vis.map(s=>{const own=owned.includes(s.id),eq=equipped===s.id,gunshipLocked=s.id==="gunship"&&!own&&bossKills<4,label=eq?"Equipped":own?"Equip":gunshipLocked?`${bossKills}/4 Bosses`:`$${s.price}`;return <LiquidGlassView key={s.id} className="rounded-2xl overflow-hidden mb-3" fallbackBackgroundColor={activeTone.bg3} glassTintColor={activeTone.bg2} glassEffectStyle="clear"><View style={S.storeRow}><View style={[S.storeGraphic,{backgroundColor:activeTone.bg4}]}><Plane id={s.id} accent={activeTone.accent} size={70}/></View><View style={{flex:1,paddingHorizontal:12}}><Text style={[S.storeName,{color:text}]}>{s.name}</Text><Text style={[S.storeDesc,{color:activeTone.muted}]}>{s.description}</Text><Text style={{color:activeTone.accent,fontSize:11,fontWeight:"800",marginTop:4}}>Speed {s.speed}</Text></View><Buy label={label} disabled={eq} active={own&&!eq} onPress={()=>buyShip(s)}/></View></LiquidGlassView>}):<>
 <Upgrade title="Jet Cannon Cooldown" value={`${FRONT_CD[upgrades.jetCooldown].toFixed(1)}s`} level={upgrades.jetCooldown} max={3} price={CD_COST[upgrades.jetCooldown]} onPress={()=>buyUpgrade("cooldown")}/>
 <Upgrade title="Jet Cannon Damage" value={`${FRONT_DAMAGE[upgrades.jetDamage]} damage`} level={upgrades.jetDamage} max={3} price={DMG_COST[upgrades.jetDamage]} onPress={()=>buyUpgrade("damage")}/>
 <Upgrade title="Jet Speed" value={`+${SPEED_BONUS[upgrades.jetSpeed]} speed`} level={upgrades.jetSpeed} max={4} price={SPD_COST[upgrades.jetSpeed]} onPress={()=>buyUpgrade("speed")}/>
 <Text style={[S.section,{color:text}]}>Nitro</Text>{vis.map(s=><LiquidGlassView key={`n-${s.id}`} className="rounded-2xl overflow-hidden mb-2" fallbackBackgroundColor={activeTone.bg3} glassTintColor={activeTone.bg2} glassEffectStyle="clear"><View style={S.nitroRow}><View><Text style={{color:text,fontWeight:"900"}}>{s.name} Nitro</Text><Text style={{color:activeTone.muted,fontSize:10}}>1.5 second boost</Text></View><Buy label={upgrades.nitroOwned[s.id]?"Owned":"$300"} disabled={!!upgrades.nitroOwned[s.id]} active={!upgrades.nitroOwned[s.id]} onPress={()=>buyNitro(s.id)}/></View></LiquidGlassView>)}</>}</ScrollView>}

 return <ScrollView contentContainerStyle={S.menu}>{bonus?<View style={[S.bonus,{backgroundColor:activeTone.accent}]}><MaterialIcons name="check-circle" size={18} color={isDark?"#111113":"#fff"}/><Text style={{color:isDark?"#111113":"#fff",fontWeight:"900"}}>Homework bonus +${bonus}</Text></View>:null}
 <View style={S.top}><View style={[S.pill,{backgroundColor:activeTone.bg3,borderColor:activeTone.border}]}><MaterialIcons name="paid" size={17} color={activeTone.accent}/><Text style={{color:text,fontWeight:"900"}}>${credits.toLocaleString()}</Text></View><Text style={{color:activeTone.muted,fontWeight:"800"}}>Best {best.toFixed(2)}s</Text></View>
 <LiquidGlassView className="rounded-3xl overflow-hidden" fallbackBackgroundColor={activeTone.bg3} glassTintColor={activeTone.bg2} glassEffectStyle="clear"><View style={S.hero}><View style={[S.heroPlane,{backgroundColor:activeTone.bg4}]}><Plane id={equipped} accent={activeTone.accent} size={124}/></View><Text style={[S.title,{color:text}]}>{ship.name}</Text><Text style={[S.desc,{color:activeTone.muted}]}>Use the joystick to steer, avoid homing missiles.</Text>{lastRun?<View style={[S.last,{backgroundColor:activeTone.bg2,borderColor:activeTone.border}]}><Text style={{color:activeTone.muted,fontSize:10,fontWeight:"800"}}>LAST RUN</Text><Text style={{color:text,fontWeight:"800"}}>{lastRun.seconds.toFixed(2)}s • +${lastRun.earned}</Text></View>:null}</View></LiquidGlassView>
 <Pressable onPress={()=>setScreen("game")} style={[S.primary,{backgroundColor:activeTone.accent}]}><MaterialIcons name="play-arrow" size={24} color={isDark?"#111113":"#fff"}/><Text style={{color:isDark?"#111113":"#fff",fontWeight:"900"}}>Play</Text></Pressable>
 <View style={S.buttonRow}><Pressable onPress={()=>setScreen("store")} style={[S.secondary,{backgroundColor:activeTone.bg3,borderColor:activeTone.border}]}><MaterialIcons name="storefront" size={20} color={activeTone.accent}/><Text style={{color:text,fontWeight:"800"}}>Store</Text></Pressable><Pressable onPress={()=>setScreen("encyclopedia")} style={[S.secondary,{backgroundColor:activeTone.bg3,borderColor:activeTone.border}]}><MaterialIcons name="menu-book" size={20} color={activeTone.accent}/><Text style={{color:text,fontWeight:"800"}}>Bosses</Text></Pressable></View>
 <Pressable onPress={()=>setFullscreen(x=>!x)} style={[S.full,{backgroundColor:activeTone.bg3,borderColor:activeTone.border}]}><Text style={{color:text,fontWeight:"800",flex:1}}>Fullscreen</Text><MaterialIcons name={fullscreen?"check-circle":"radio-button-unchecked"} size={23} color={activeTone.accent}/></Pressable></ScrollView>;
}

function Top({credits,onBack}:{credits:number;onBack:()=>void}){const {activeTone,isDark}=useTheme(),t=isDark?"#edebea":"#2f3035";return <View style={S.top}><Pressable onPress={onBack} style={[S.back,{backgroundColor:activeTone.bg3,borderColor:activeTone.border}]}><MaterialIcons name="arrow-back" size={19} color={t}/><Text style={{color:t,fontWeight:"800"}}>Menu</Text></Pressable><View style={[S.pill,{backgroundColor:activeTone.bg3,borderColor:activeTone.border}]}><MaterialIcons name="paid" size={17} color={activeTone.accent}/><Text style={{color:t,fontWeight:"900"}}>${credits.toLocaleString()}</Text></View></View>}
function Buy({label,disabled,active,onPress}:{label:string;disabled?:boolean;active?:boolean;onPress:()=>void}){const {activeTone,isDark}=useTheme();return <Pressable disabled={disabled} onPress={onPress} style={[S.buy,{backgroundColor:active?activeTone.accent:activeTone.bg4,borderColor:activeTone.border,opacity:disabled?.65:1}]}><Text style={{color:active?(isDark?"#111113":"#fff"):(isDark?"#edebea":"#2f3035"),fontSize:10,fontWeight:"900"}}>{label}</Text></Pressable>}
function Upgrade({title,value,level,max,price,onPress}:{title:string;value:string;level:number;max:number;price?:number;onPress:()=>void}){const {activeTone,isDark}=useTheme(),t=isDark?"#edebea":"#2f3035",done=level>=max;return <LiquidGlassView className="rounded-2xl overflow-hidden mb-2" fallbackBackgroundColor={activeTone.bg3} glassTintColor={activeTone.bg2} glassEffectStyle="clear"><View style={S.upgrade}><View style={{flex:1}}><Text style={{color:t,fontWeight:"900"}}>{title}</Text><Text style={{color:activeTone.muted,fontSize:10}}>{value} • Level {level}/{max}</Text></View><Buy label={done?"MAX":`$${price}`} disabled={done} active={!done} onPress={onPress}/></View></LiquidGlassView>}

function Flight({ship,upgrades,fullscreen,best,onFinish,onExit}:{ship:Ship;upgrades:Upgrades;fullscreen:boolean;best:number;onFinish:(s:number)=>void;onExit:()=>void}){
 const {activeTone,isDark}=useTheme(),insets=useSafeAreaInsets(),{width:sw,height:sh}=useWindowDimensions(),t=isDark?"#edebea":"#2f3035";
 const aw=fullscreen?sw:Math.max(280,sw-40), ah=fullscreen?Math.max(440,sh-insets.top-insets.bottom-4):455;
 const speedBase=ship.speed+(ship.id==="jet"?SPEED_BONUS[upgrades.jetSpeed]:0), frontCd=ship.id==="gunship"?.55:ship.id==="jet"?FRONT_CD[upgrades.jetCooldown]:3, frontDmg=ship.id==="jet"?FRONT_DAMAGE[upgrades.jetDamage]:1, hasNitro=!!upgrades.nitroOwned[ship.id];
 const initial={x:aw*.34,y:ah*.5},camera0={x:-initial.x,y:-initial.y};
 const [running,setRunning]=useState(true),[crashed,setCrashed]=useState(false);
 const [scene,setScene]=useState<Scene>({plane:initial,heading:0,camera:camera0,missiles:[],shots:[],bossBullets:[],flares:[],explosions:[],trail:[],elapsed:0,health:3,boss:null,frontCd:0,rearCd:0,seekCd:0,flareCd:0,nitroCd:0,nitro:false,ace:0,shield:false,complete:false});
 const planeRender=useRef(new Animated.ValueXY({x:initial.x-30,y:initial.y-30})).current,planeHeading=useRef(new Animated.Value(ship.id==="maxwell"?0:90)).current;
 const planeRotate=planeHeading.interpolate({inputRange:[0,360],outputRange:["0deg","360deg"]});
 const joyAnim=useRef(new Animated.ValueXY({x:0,y:0})).current,run=useRef(true),finished=useRef(false),elapsed=useRef(0),plane=useRef({x:0,y:0}),camera=useRef(camera0),vel=useRef({x:speedBase*.62,y:0}),joy=useRef({x:0,y:0}),lastDir=useRef({x:1,y:0}),prevDir=useRef({x:1,y:0}),straight=useRef(0),health=useRef(3),invuln=useRef(0),shield=useRef(0),ace=useRef(0);
 const missiles=useRef<Missile[]>([]),shots=useRef<Shot[]>([]),bossBullets=useRef<BossBullet[]>([]),flares=useRef<Flare[]>([]),explosions=useRef<Explosion[]>([]),trail=useRef<{x:number;y:number}[]>([]),boss=useRef<Boss|null>(null),doneBosses=useRef(new Set<number>());
 const frame=useRef<number|null>(null),lastFrame=useRef<number|null>(null),lastUi=useRef(0),nextMissile=useRef(.8),mid=useRef(1),sid=useRef(1),bbid=useRef(1),fid=useRef(1),eid=useRef(1),lastFront=useRef(-1e8),lastRear=useRef(-1e8),lastSeek=useRef(-1e8),lastFlare=useRef(-1e8),lastAutoFlare=useRef(-1e8),lastNitro=useRef(-1e8),nitroUntil=useRef(0),lastPassive=useRef(-1e8),passiveUntil=useRef(0),lastTrail=useRef(0),victory=useRef(false),nextBossId=useRef<1|2|3|4|5>(1),nextBossAt=useRef(30),gunshipBurst=useRef(0),gunshipBurstAt=useRef(0);
 const world=(x:number,y:number)=>({x:x-camera.current.x,y:y-camera.current.y});
 const boom=(x:number,y:number,power=.8)=>explosions.current.push({id:eid.current++,x,y,bornAt:Date.now(),power});
 const bossBoom=(x:number,y:number)=>{const n=Date.now();explosions.current.push({id:eid.current++,x,y,bornAt:n,power:2.5});for(let i=0;i<7;i++){const a=i/7*Math.PI*2,r=18+(i%3)*8;explosions.current.push({id:eid.current++,x:x+Math.cos(a)*r,y:y+Math.sin(a)*r,bornAt:n,power:1.15+(i%2)*.25})}explosions.current=explosions.current.slice(-18)};
 const end=()=>{if(finished.current)return;finished.current=true;run.current=false;setRunning(false);setCrashed(true);onFinish(elapsed.current);hapticsImpact(Haptics.ImpactFeedbackStyle.Heavy)};
 const hurt=()=>{const n=Date.now();if(n<invuln.current)return;if(n<shield.current){shield.current=0;invuln.current=n+700;return}health.current--;invuln.current=n+900;hapticsImpact(Haptics.ImpactFeedbackStyle.Heavy);if(health.current<=0)end()};
 const spawnMissile=()=>{const id=mid.current++,elite=id%5===0,c=camera.current,edge=id%4;let x=c.x+aw+55,y=c.y+45+((id*79)%Math.max(100,ah-90));if(edge===1){x=c.x+70+((id*91)%Math.max(120,aw-140));y=c.y-55}else if(edge===2){x=c.x-55;y=c.y+60+((id*67)%Math.max(100,ah-120))}else if(edge===3){x=c.x+90+((id*53)%Math.max(120,aw-160));y=c.y+ah+55}const d=norm(plane.current.x-x,plane.current.y-y),s=(98+Math.min(220,elapsed.current*.34))*(elite?1.12:1);missiles.current.push({id,x,y,vx:d.x*s,vy:d.y*s,age:0,rotation:Math.atan2(d.y,d.x)*180/Math.PI,elite,hp:elite?3:1,nearMissed:false})};
 const spawnBoss=(id:1|2|3|4)=>{const d=BOSSES.find(x=>x.id===id)!,home={x:camera.current.x+aw*.52,y:camera.current.y+ah*.18};boss.current={id,name:d.name,x:home.x,y:home.y,vx:0,vy:0,hp:d.hp,maxHp:d.hp,nextShot:elapsed.current+1.2,nextRam:elapsed.current+7.5,ram:"idle",phaseAt:elapsed.current,targetX:plane.current.x,targetY:plane.current.y};bossBullets.current=[];hapticsImpact(Haptics.ImpactFeedbackStyle.Heavy)};
 const bossFire=(b:Boss)=>{const d=BOSSES.find(x=>x.id===b.id)!,base=Math.atan2(plane.current.y-b.y,plane.current.x-b.x),spread=b.id===1?0:b.id===2?.28:b.id===3?.5:.68;for(let i=0;i<d.spread;i++){const q=d.spread===1?0:i/(d.spread-1)-.5,a=base+q*spread;bossBullets.current.push({id:bbid.current++,x:b.x,y:b.y,vx:Math.cos(a)*d.bullet,vy:Math.sin(a)*d.bullet,age:0})}bossBullets.current=bossBullets.current.slice(-24)};
 const fireFront=()=>{if(!run.current||!boss.current)return;const n=Date.now();if(n-lastFront.current<frontCd*1000)return;lastFront.current=n;if(ship.id==="gunship"){gunshipBurst.current=7;gunshipBurstAt.current=n;return}const d=norm(vel.current.x,vel.current.y);shots.current.push({id:sid.current++,x:plane.current.x+d.x*24,y:plane.current.y+d.y*24,vx:d.x*470,vy:d.y*470,age:0,damage:frontDmg,kind:"front"})};
 const fireRear=()=>{const can=ship.ability==="rearGun"||ship.ability==="gunFlares"||ship.ability==="fighter"||ship.ability==="gunship";if(!can||!run.current)return;const n=Date.now(),cooldown=ship.id==="fighter"||ship.id==="gunship"?0:3000;if(n-lastRear.current<cooldown)return;lastRear.current=n;const d=norm(vel.current.x,vel.current.y),base=Math.atan2(-d.y,-d.x);[-.065,0,.065].forEach(off=>{const a=base+off;shots.current.push({id:sid.current++,x:plane.current.x-d.x*22,y:plane.current.y-d.y*22,vx:Math.cos(a)*445,vy:Math.sin(a)*445,age:0,damage:1,kind:"rear"})})};
 const fireHunter=()=>{const count=ship.id==="fighter"?2:ship.id==="gunship"?3:ship.id==="bomber"?1:0;if(!count||!run.current)return;const n=Date.now();if(n-lastSeek.current<1500)return;const sorted=missiles.current.slice().sort((a,b)=>dist(a.x,a.y,plane.current.x,plane.current.y)-dist(b.x,b.y,plane.current.x,plane.current.y));if(!sorted.length)return;const targets=Array.from({length:count},(_,i)=>sorted[i%sorted.length]);lastSeek.current=n;targets.forEach((target,i)=>{const d=norm(target.x-plane.current.x,target.y-plane.current.y),p={x:-d.y,y:d.x},offset=(i-(targets.length-1)/2)*8;shots.current.push({id:sid.current++,x:plane.current.x+p.x*offset,y:plane.current.y+p.y*offset,vx:d.x*300,vy:d.y*300,age:0,damage:2,kind:"hunter",targetId:target.id})})};
 const spawnFlares=(front:boolean,offsets:number[],forwardSpeed:number,lateral:number,n:number)=>{const d=norm(vel.current.x,vel.current.y),p={x:-d.y,y:d.x},sign=front?1:-1;offsets.forEach(o=>flares.current.push({id:fid.current++,x:plane.current.x+d.x*18*sign,y:plane.current.y+d.y*18*sign,vx:d.x*forwardSpeed*sign+p.x*o*lateral,vy:d.y*forwardSpeed*sign+p.y*o*lateral,expiresAt:n+3600}))};
 const deployFlares=()=>{const can=ship.ability==="flares"||ship.ability==="gunFlares"||ship.ability==="scoutFlares"||ship.ability==="stealth";if(!can||!run.current)return;const n=Date.now();if(n-lastFlare.current<8000)return;lastFlare.current=n;if(ship.id==="scout"){spawnFlares(false,[-.55,0,.55],48,32,n);return}if(ship.id==="stealth"){spawnFlares(false,[-.75,-.25,.25,.75],64,44,n);spawnFlares(true,[-.75,-.25,.25,.75],58,40,n);return}spawnFlares(false,[-1,-.5,0,.5,1],70,55,n)};
 const autoGunshipFlares=(n:number)=>{if(ship.id!=="gunship"||n-lastAutoFlare.current<3500)return;const nearest=missiles.current.reduce((best,m)=>Math.min(best,dist(m.x,m.y,plane.current.x,plane.current.y)),Infinity);if(nearest>120)return;lastAutoFlare.current=n;spawnFlares(false,[-1,-.5,0,.5,1],72,58,n);spawnFlares(true,[-.7,0,.7],55,42,n)};
 const nitro=()=>{if(!hasNitro||!run.current)return;const n=Date.now();if(n-lastNitro.current<10000)return;lastNitro.current=n;nitroUntil.current=n+1500;hapticsImpact(Haptics.ImpactFeedbackStyle.Heavy)};
 const setJoy=(lx:number,ly:number)=>{const c=55,r=40,dx=lx-c,dy=ly-c,l=Math.hypot(dx,dy),s=l>r&&l>0?r/l:1;let x=dx*s/r,y=dy*s/r;if(Math.hypot(x,y)<.09){x=0;y=0}joy.current={x,y};joyAnim.setValue({x:x*r,y:y*r})};
 const releaseJoy=()=>{joy.current={x:0,y:0};joyAnim.setValue({x:0,y:0})};
 const pending=useRef<{x:number;y:number}|null>(null),touchFrame=useRef<number|null>(null);
 const queueJoy=(x:number,y:number)=>{pending.current={x,y};if(touchFrame.current!==null)return;touchFrame.current=requestAnimationFrame(()=>{touchFrame.current=null;const p=pending.current;pending.current=null;if(p)setJoy(p.x,p.y)})};
 const pan=useRef(PanResponder.create({onStartShouldSetPanResponder:()=>true,onStartShouldSetPanResponderCapture:()=>true,onMoveShouldSetPanResponder:()=>true,onMoveShouldSetPanResponderCapture:()=>true,onPanResponderTerminationRequest:()=>false,onPanResponderGrant:e=>queueJoy(e.nativeEvent.locationX,e.nativeEvent.locationY),onPanResponderMove:e=>queueJoy(e.nativeEvent.locationX,e.nativeEvent.locationY),onPanResponderRelease:releaseJoy,onPanResponderTerminate:releaseJoy})).current;

 const publish=(time:number)=>{if(time-lastUi.current<SCENE_PUBLISH_MS)return;lastUi.current=time;const n=Date.now(),p=world(plane.current.x,plane.current.y),rearBase=ship.id==="fighter"||ship.id==="gunship"?0:3;setScene({plane:p,heading:Math.atan2(vel.current.y,vel.current.x)*180/Math.PI,camera:{...camera.current},missiles:[...missiles.current],shots:[...shots.current],bossBullets:[...bossBullets.current],flares:[...flares.current],explosions:[...explosions.current],trail:[...trail.current],elapsed:elapsed.current,health:health.current,boss:boss.current?{...boss.current}:null,frontCd:Math.max(0,frontCd-(n-lastFront.current)/1000),rearCd:Math.max(0,rearBase-(n-lastRear.current)/1000),seekCd:Math.max(0,1.5-(n-lastSeek.current)/1000),flareCd:Math.max(0,8-(n-lastFlare.current)/1000),nitroCd:Math.max(0,10-(n-lastNitro.current)/1000),nitro:n<nitroUntil.current||n<passiveUntil.current,ace:ace.current,shield:n<shield.current,complete:victory.current})};
 const reset=()=>{elapsed.current=0;plane.current={x:0,y:0};camera.current={...camera0};vel.current={x:speedBase*.62,y:0};planeRender.setValue({x:initial.x-30,y:initial.y-30});planeHeading.setValue(ship.id==="maxwell"?0:90);joy.current={x:0,y:0};lastDir.current={x:1,y:0};prevDir.current={x:1,y:0};straight.current=0;health.current=3;invuln.current=0;shield.current=0;ace.current=0;missiles.current=[];shots.current=[];bossBullets.current=[];flares.current=[];explosions.current=[];trail.current=[];boss.current=null;doneBosses.current=new Set();nextBossId.current=1;nextBossAt.current=BOSSES[0].delay;nextMissile.current=.8;lastFront.current=lastRear.current=lastSeek.current=lastFlare.current=lastAutoFlare.current=lastNitro.current=lastPassive.current=-1e8;nitroUntil.current=passiveUntil.current=0;gunshipBurst.current=0;gunshipBurstAt.current=0;victory.current=false;finished.current=false;run.current=true;setRunning(true);setCrashed(false);lastFrame.current=null;lastUi.current=0;publish(performance.now())};
 useEffect(()=>{reset();return()=>{run.current=false;if(frame.current!==null)cancelAnimationFrame(frame.current);if(touchFrame.current!==null)cancelAnimationFrame(touchFrame.current)}},[aw,ah,ship.id]);

 useEffect(()=>{if(!running)return;const tick=(time:number)=>{if(!run.current)return;const prev=lastFrame.current??time,dt=Math.min(.026,(time-prev)/1000);lastFrame.current=time;elapsed.current+=dt;const now=Date.now(),j=joy.current,jm=Math.min(1,Math.hypot(j.x,j.y));
   const passiveShip=ship.id==="stealth"||ship.id==="gunship";if(passiveShip&&missiles.current.length>=4&&now-lastPassive.current>=5000){lastPassive.current=now;passiveUntil.current=now+1500}const boostActive=now<nitroUntil.current||now<passiveUntil.current;
   if(jm>.1){const nd=norm(j.x,j.y),dot=nd.x*prevDir.current.x+nd.y*prevDir.current.y;straight.current=dot>.993?straight.current+dt:Math.max(0,straight.current-dt*4.5);prevDir.current=nd;lastDir.current=nd;const boost=now<nitroUntil.current?1.62:now<passiveUntil.current?1.38:1,target={x:nd.x*speedBase*(.78+jm*.22)*boost,y:nd.y*speedBase*(.78+jm*.22)*boost},s=Math.min(1,dt*ship.accel);vel.current.x+=(target.x-vel.current.x)*s;vel.current.y+=(target.y-vel.current.y)*s}else{straight.current+=dt;if(boostActive){const mul=now<nitroUntil.current?.72:.44;vel.current.x*=1+mul*dt;vel.current.y*=1+mul*dt}}
   if(ship.id==="gunship"&&gunshipBurst.current>0&&now>=gunshipBurstAt.current&&boss.current){const d=norm(vel.current.x,vel.current.y);shots.current.push({id:sid.current++,x:plane.current.x+d.x*24,y:plane.current.y+d.y*24,vx:d.x*500,vy:d.y*500,age:0,damage:1,kind:"front"});gunshipBurst.current--;gunshipBurstAt.current=now+65}
   const sp=Math.hypot(vel.current.x,vel.current.y),min=speedBase*.55;if(sp<min){vel.current.x+=lastDir.current.x*speedBase*.32*dt;vel.current.y+=lastDir.current.y*speedBase*.32*dt}
   plane.current={x:plane.current.x+vel.current.x*dt,y:plane.current.y+vel.current.y*dt};let ps=world(plane.current.x,plane.current.y),le=aw*.24,re=aw*.76,te=ah*.22,be=ah*.78;if(ps.x<le)camera.current.x+=(ps.x-le)*Math.min(1,dt*8);else if(ps.x>re)camera.current.x+=(ps.x-re)*Math.min(1,dt*8);if(ps.y<te)camera.current.y+=(ps.y-te)*Math.min(1,dt*8);else if(ps.y>be)camera.current.y+=(ps.y-be)*Math.min(1,dt*8);
   ps=world(plane.current.x,plane.current.y);planeRender.setValue({x:ps.x-30,y:ps.y-30});const rawHeading=Math.atan2(vel.current.y,vel.current.x)*180/Math.PI+(ship.id==="maxwell"?0:90);planeHeading.setValue((rawHeading%360+360)%360);

   if(!boss.current&&nextBossId.current<=4&&elapsed.current>=nextBossAt.current)spawnBoss(nextBossId.current as 1|2|3|4);
   const bossOn=!!boss.current;if(elapsed.current>=nextMissile.current){spawnMissile();nextMissile.current=elapsed.current+(bossOn?2.5:Math.max(.46,1.72-elapsed.current*.0016))}autoGunshipFlares(now);
   const af=flares.current.map(f=>({...f,x:f.x+f.vx*dt,y:f.y+f.vy*dt})).filter(f=>f.expiresAt>now);flares.current=af;
   let nm=missiles.current.map(m=>{const tf=af.slice().sort((a,b)=>dist(m.x,m.y,a.x,a.y)-dist(m.x,m.y,b.x,b.y))[0],target=tf??plane.current,d=norm(target.x-m.x,target.y-m.y),ramp=Math.min(m.elite?185:250,elapsed.current*(m.elite?.27:.36)),sb=Math.min(m.elite?115:170,straight.current*(m.elite?9:13)),ms=(105+ramp+sb)*(m.elite?1.10:1),tr=(1.8+Math.min(4,elapsed.current*.006))*(m.elite?.72:1),dvx=d.x*ms,dvy=d.y*ms,b=Math.min(1,tr*dt),vx=m.vx+(dvx-m.vx)*b,vy=m.vy+(dvy-m.vy)*b,n={...m,x:m.x+vx*dt,y:m.y+vy*dt,vx,vy,age:m.age+dt,rotation:Math.atan2(vy,vx)*180/Math.PI},dd=dist(n.x,n.y,plane.current.x,plane.current.y);if(!n.nearMissed&&dd>17&&dd<43){n.nearMissed=true;ace.current++;if(ace.current>=5){ace.current=0;shield.current=now+2200}}return n}).filter(m=>m.age<20);
   let ns=shots.current.map(s=>{if(s.kind==="hunter"){const target=nm.find(m=>m.id===s.targetId)??nm[0];if(target){const d=norm(target.x-s.x,target.y-s.y),b=Math.min(1,dt*7);s.vx+=(d.x*340-s.vx)*b;s.vy+=(d.y*340-s.vy)*b}}return{...s,x:s.x+s.vx*dt,y:s.y+s.vy*dt,age:s.age+dt}}).filter(s=>s.age<(s.kind==="hunter"?4.5:2.6));
   const dm=new Set<number>(),ds=new Set<number>();for(const s of ns){for(const m of nm){if(dm.has(m.id))continue;if(s.kind==="rear"&&m.elite)continue;if(dist(s.x,s.y,m.x,m.y)<(m.elite?17:14)){m.hp-=s.damage;ds.add(s.id);if(m.hp<=0){dm.add(m.id);boom(m.x,m.y)}break}}}
   for(let a=0;a<nm.length;a++){const x=nm[a];if(dm.has(x.id))continue;for(let b=a+1;b<nm.length;b++){const y=nm[b];if(dm.has(y.id))continue;if(x.age>.8&&y.age>.8&&dist(x.x,x.y,y.x,y.y)<(x.elite||y.elite?17:14)){dm.add(x.id);dm.add(y.id);boom((x.x+y.x)/2,(x.y+y.y)/2);break}}}
   af.forEach(f=>nm.forEach(m=>{if(!dm.has(m.id)&&dist(f.x,f.y,m.x,m.y)<14){dm.add(m.id);boom(m.x,m.y)}}));nm=nm.filter(m=>!dm.has(m.id));ns=ns.filter(s=>!ds.has(s.id));
   const hit=nm.find(m=>dist(m.x,m.y,plane.current.x,plane.current.y)<(m.elite?16:13));if(hit){if(now<shield.current){shield.current=0;boom(hit.x,hit.y);nm=nm.filter(m=>m.id!==hit.id)}else{end();return}}

   if(boss.current){const b=boss.current,d=BOSSES.find(x=>x.id===b.id)!;
     if(b.ram==="idle"){const target={x:camera.current.x+aw*.52+Math.sin(elapsed.current*.62)*aw*.12,y:camera.current.y+ah*.18+Math.sin(elapsed.current*.9)*ah*.045};b.x+=(target.x-b.x)*Math.min(1,dt*d.follow);b.y+=(target.y-b.y)*Math.min(1,dt*d.follow);if(elapsed.current>=b.nextShot){bossFire(b);b.nextShot=elapsed.current+d.shot}if(d.ram&&elapsed.current>=b.nextRam){b.ram="windup";b.phaseAt=elapsed.current;b.targetX=plane.current.x;b.targetY=plane.current.y}}
     else if(b.ram==="windup"){if(elapsed.current-b.phaseAt>1.25){const q=norm(b.targetX-b.x,b.targetY-b.y);b.vx=q.x*420;b.vy=q.y*420;b.ram="dash";b.phaseAt=elapsed.current}}
     else if(b.ram==="dash"){b.x+=b.vx*dt;b.y+=b.vy*dt;if(dist(b.x,b.y,plane.current.x,plane.current.y)<30)hurt();if(elapsed.current-b.phaseAt>.9){b.ram="return";b.phaseAt=elapsed.current}}
     else{const q={x:camera.current.x+aw*.52,y:camera.current.y+ah*.18};b.x+=(q.x-b.x)*Math.min(1,dt*4.5);b.y+=(q.y-b.y)*Math.min(1,dt*4.5);if(elapsed.current-b.phaseAt>1.5){b.ram="idle";b.nextRam=elapsed.current+(b.id===2?9:7)}}
     const bh=ns.filter(s=>s.kind==="front"&&dist(s.x,s.y,b.x,b.y)<(b.id===4?45:36));for(const s of bh){b.hp-=s.damage;ds.add(s.id)}ns=ns.filter(s=>!ds.has(s.id));
     if(b.hp<=0){doneBosses.current.add(b.id);bossBoom(b.x,b.y);bossBullets.current=[];boss.current=null;AsyncStorage.getItem(SHIP_CREDITS_KEY).then(raw=>AsyncStorage.setItem(SHIP_CREDITS_KEY,String(Math.floor((Number(raw)||0)+d.reward)))).catch(()=>{});AsyncStorage.getItem(BOSS_KILLS_KEY).then(raw=>AsyncStorage.setItem(BOSS_KILLS_KEY,String(Math.floor((Number(raw)||0)+1)))).catch(()=>{});if(b.id<4){const next=(b.id+1) as 2|3|4;nextBossId.current=next;nextBossAt.current=elapsed.current+BOSSES.find(x=>x.id===next)!.delay}else{nextBossId.current=5;victory.current=true;run.current=false;setRunning(false);if(!finished.current){finished.current=true;onFinish(elapsed.current)}}}
   }
   let bb=bossBullets.current.map(x=>({...x,x:x.x+x.vx*dt,y:x.y+x.vy*dt,age:x.age+dt})).filter(x=>x.age<6);const hb=bb.find(x=>dist(x.x,x.y,plane.current.x,plane.current.y)<11);if(hb){bb=bb.filter(x=>x.id!==hb.id);hurt();if(!run.current)return}
   missiles.current=nm.slice(-18);shots.current=ns.slice(-18);bossBullets.current=bb.slice(-24);explosions.current=explosions.current.filter(e=>now-e.bornAt<950);
   if(elapsed.current-lastTrail.current>((now<nitroUntil.current||now<passiveUntil.current)?.022:.045)){lastTrail.current=elapsed.current;trail.current=[{x:plane.current.x,y:plane.current.y},...trail.current].slice(0,(now<nitroUntil.current||now<passiveUntil.current)?28:18)}
   publish(time);if(run.current)frame.current=requestAnimationFrame(tick)
 };frame.current=requestAnimationFrame(tick);return()=>{if(frame.current!==null)cancelAnimationFrame(frame.current);frame.current=null;lastFrame.current=null}},[running,aw,ah,ship.id,ship.speed,ship.accel,frontCd,frontDmg,speedBase]);

 const cellW=270,cellH=205,sx=Math.floor(scene.camera.x/cellW),sy=Math.floor(scene.camera.y/cellH),clouds=useMemo(()=>Array.from({length:28},(_,i)=>{const col=i%7,row=Math.floor(i/7),gx=sx-3+col,gy=sy-2+row,xj=Math.abs(gx*61+gy*97)%125,yj=Math.abs(gx*43+gy*71)%82;return{key:`${gx}:${gy}`,worldX:gx*cellW+xj,worldY:gy*cellH+yj,rainy:Math.abs(gx*3+gy*5)%5===0,opacity:.075+(Math.abs(gx+gy)%4)*.025}}),[sx,sy]);
 const canRear=ship.ability==="rearGun"||ship.ability==="gunFlares"||ship.ability==="fighter"||ship.ability==="gunship",canFlares=ship.ability==="flares"||ship.ability==="gunFlares"||ship.ability==="scoutFlares"||ship.ability==="stealth",canSeek=ship.id==="bomber"||ship.id==="fighter"||ship.id==="gunship";
 const exit=()=>{if(run.current&&!finished.current){finished.current=true;run.current=false;onFinish(elapsed.current)}onExit()};
 const bs=scene.boss?{x:scene.boss.x-scene.camera.x,y:scene.boss.y-scene.camera.y}:null,rt=scene.boss&&scene.boss.ram==="windup"?{x:scene.boss.targetX-scene.camera.x,y:scene.boss.targetY-scene.camera.y}:null;

 return <View style={[fullscreen?S.fullRoot:S.embed,{backgroundColor:activeTone.bg1,paddingTop:fullscreen?insets.top:0,paddingBottom:fullscreen?insets.bottom:0}]}>
  <View style={S.gameTop}><Pressable onPress={exit} style={[S.close,{backgroundColor:activeTone.bg3,borderColor:activeTone.border}]}><MaterialIcons name="close" size={21} color={t}/></Pressable><View style={{flex:1}}><Text style={{color:t,fontWeight:"900"}}>{scene.elapsed.toFixed(2)}s</Text><Text style={{color:activeTone.muted,fontSize:9}}>+${Math.floor(scene.elapsed*3)} • Best {best.toFixed(2)}s</Text></View><View style={S.hearts}>{[1,2,3].map(h=><MaterialIcons key={h} name={scene.health>=h?"favorite":"favorite-border"} size={17} color={activeTone.accent}/>)}</View></View>
  {scene.boss?<View style={S.bossHud}><View style={S.bossHudTop}><Text style={{color:t,fontWeight:"900",fontSize:11}}>{scene.boss.name}</Text><Text style={{color:activeTone.muted,fontSize:9}}>{Math.max(0,Math.ceil(scene.boss.hp))}/{scene.boss.maxHp}</Text></View><View style={[S.bossTrack,{backgroundColor:activeTone.bg4}]}><View style={[S.bossFill,{backgroundColor:activeTone.accent,width:`${clamp(scene.boss.hp/scene.boss.maxHp,0,1)*100}%`} ]}/></View></View>:null}
  <View style={[S.arena,{width:aw,height:fullscreen?Math.max(360,ah-78):ah,backgroundColor:activeTone.bg2,borderColor:activeTone.border}]}>
   <View style={[StyleSheet.absoluteFillObject,{backgroundColor:`${activeTone.accent}0E`} ]}/>
   <ShipVectorLayer scene={scene} clouds={clouds} width={aw} height={ah} accent={activeTone.accent} fg={activeTone.fg} />
   {scene.boss&&bs?<>{rt?<Svg width={aw} height={ah} style={StyleSheet.absoluteFillObject} pointerEvents="none"><Line x1={bs.x} y1={bs.y} x2={rt.x} y2={rt.y} stroke={activeTone.accent} strokeWidth={4} strokeDasharray="12 10" opacity={.42}/></Svg>:null}<View style={[S.bossSprite,{left:bs.x-(scene.boss.id===4?64:50),top:bs.y-(scene.boss.id===4?64:50),transform:[{rotate:`${Math.atan2(scene.plane.y-bs.y,scene.plane.x-bs.x)*180/Math.PI+90}deg`}]}]}><BossSprite id={scene.boss.id} accent={activeTone.accent} size={scene.boss.id===4?128:100}/></View></>:null}
   <Animated.View pointerEvents="none" style={[S.planePos,{left:0,top:0,transform:[{translateX:planeRender.x},{translateY:planeRender.y},{rotate:planeRotate}]}]}>
    {scene.shield?<View style={[S.shieldLocal,{borderColor:activeTone.accent}]}/>:null}
    {scene.nitro?[-1,0,1].map(o=><View key={o} style={[S.nitroParticleLocal,{top:27+o*8,left:-10-o*7,backgroundColor:activeTone.accent}]}/>):null}
    <Plane id={ship.id} accent={activeTone.accent} size={60}/>
   </Animated.View>
   <View {...pan.panHandlers} style={[S.joystick,fullscreen?{left:20,bottom:20+insets.bottom}:null,{backgroundColor:activeTone.bg3,borderColor:activeTone.border}]}><Animated.View pointerEvents="none" style={[S.knob,{backgroundColor:activeTone.accent,transform:[{translateX:joyAnim.x},{translateY:joyAnim.y}]}]}/></View>
   {scene.boss?<Ability label={scene.frontCd>.05?`${scene.frontCd.toFixed(1)}s`:ship.id==="gunship"?"MINIGUN":"CANNON"} icon="my-location" disabled={scene.frontCd>.05} bottom={fullscreen?20+insets.bottom:22} onPress={fireFront}/>:null}
   {canRear?<Ability label={scene.rearCd>.05?`${scene.rearCd.toFixed(1)}s`:"REAR x3"} icon="gps-fixed" disabled={scene.rearCd>.05} bottom={fullscreen?86+insets.bottom:88} onPress={fireRear}/>:null}
   {canSeek?<Ability label={scene.seekCd>.05?`${scene.seekCd.toFixed(1)}s`:ship.id==="gunship"?"SEEK x3":ship.id==="fighter"?"SEEK x2":"SEEK"} icon="track-changes" disabled={scene.seekCd>.05} bottom={fullscreen?152+insets.bottom:154} onPress={fireHunter}/>:null}
   {canFlares?<Ability label={scene.flareCd>.05?`${scene.flareCd.toFixed(1)}s`:ship.id==="stealth"?"DUAL FLARE":"FLARES"} icon="flare" disabled={scene.flareCd>.05} bottom={fullscreen?(canSeek?218:152)+insets.bottom:(canSeek?220:154)} onPress={deployFlares}/>:null}
   {hasNitro?<Ability label={scene.nitroCd>.05?`${scene.nitroCd.toFixed(1)}s`:"NITRO"} icon="bolt" disabled={scene.nitroCd>.05} bottom={fullscreen?(canFlares?284:canSeek?218:152)+insets.bottom:(canFlares?286:canSeek?220:154)} onPress={nitro}/>:null}
   <View style={[S.ace,{backgroundColor:activeTone.bg3,borderColor:activeTone.border}]}><Text style={{color:scene.shield?activeTone.accent:activeTone.muted,fontSize:9,fontWeight:"900"}}>{scene.shield?"ACE SHIELD":`ACE ${scene.ace}/5`}</Text></View>
   {crashed?<Overlay title="Run Over" body={`${scene.elapsed.toFixed(2)}s • +$${Math.floor(scene.elapsed*3)}`} retry={reset} menu={onExit}/>:null}
   {scene.complete?<View style={S.credits}><MaterialIcons name="emoji-events" size={52} color={activeTone.accent}/><Text style={S.creditsTitle}>Flight Complete</Text><Text style={S.creditsText}>All four bosses defeated.</Text><Text style={S.creditsText}>Survival time {scene.elapsed.toFixed(2)}s</Text><View style={S.divider}/><Text style={S.creditLine}>TeachAssist+ • Minigames</Text><Text style={[S.creditLine,{opacity:.68}]}>Thanks for playing.</Text><Pressable onPress={onExit} style={[S.overlayBtn,{backgroundColor:activeTone.accent,marginTop:22,minWidth:150}]}><Text style={{color:isDark?"#111113":"#fff",fontWeight:"900"}}>Continue</Text></Pressable></View>:null}
  </View>
 </View>;
}

function ShipVectorLayer({scene,clouds,width,height,accent,fg}:{scene:Scene;clouds:{key:string;worldX:number;worldY:number;rainy:boolean;opacity:number}[];width:number;height:number;accent:string;fg:string}){
 const now=Date.now();
 return <Svg pointerEvents="none" width={width} height={height} style={StyleSheet.absoluteFillObject}>
  {clouds.map(c=>{const x=c.worldX-scene.camera.x,y=c.worldY-scene.camera.y;return <G key={c.key} opacity={c.opacity}><Circle cx={x+34} cy={y+34} r={22} fill="#fff"/><Circle cx={x+61} cy={y+24} r={28} fill="#fff"/><Circle cx={x+88} cy={y+36} r={20} fill="#fff"/><Line x1={x+22} y1={y+48} x2={x+101} y2={y+48} stroke="#fff" strokeWidth={25} strokeLinecap="round"/>{c.rainy?[0,1,2,3].map(i=><Line key={i} x1={x+28+i*19} y1={y+59} x2={x+24+i*19} y2={y+75} stroke="#dceeff" strokeWidth={2} opacity={.65}/>):null}</G>})}
  {scene.trail.map((p,i)=>{const x=p.x-scene.camera.x,y=p.y-scene.camera.y,r=Math.max(1.2,(scene.nitro?4.5:3.6)-i*.12);return <Circle key={`t${i}`} cx={x} cy={y} r={r} fill={accent} opacity={Math.max(.04,(scene.nitro?.75:.48)-i*.022)}/>})}
  {scene.missiles.map(m=>{const x=m.x-scene.camera.x,y=m.y-scene.camera.y,color=m.elite?fg:accent,d=norm(m.vx,m.vy),scale=m.elite?1.2:1;return <G key={`m${m.id}`}><Line x1={x-d.x*24} y1={y-d.y*24} x2={x-d.x*8} y2={y-d.y*8} stroke={color} strokeWidth={m.elite?5:4} strokeLinecap="round" opacity={.55}/><G transform={`rotate(${m.rotation} ${x} ${y})`}><Polygon points={`${x+13*scale},${y} ${x-10*scale},${y-8*scale} ${x-10*scale},${y+8*scale}`} fill={color}/></G></G>})}
  {scene.shots.map(s=>{const d=norm(s.vx,s.vy),x=s.x-scene.camera.x,y=s.y-scene.camera.y,l=s.kind==="hunter"?9:7;return <Line key={`s${s.id}`} x1={x-d.x*l} y1={y-d.y*l} x2={x+d.x*l} y2={y+d.y*l} stroke={fg} strokeWidth={s.kind==="hunter"?4:3} strokeLinecap="round"/>})}
  {scene.bossBullets.map(b=><Circle key={`bb${b.id}`} cx={b.x-scene.camera.x} cy={b.y-scene.camera.y} r={4} fill={fg}/>)}
  {scene.flares.map(f=><Circle key={`f${f.id}`} cx={f.x-scene.camera.x} cy={f.y-scene.camera.y} r={5} fill={fg} opacity={.9}/>)}
  {scene.explosions.map(e=>{const age=Math.max(0,now-e.bornAt),life=Math.max(0,1-age/950),x=e.x-scene.camera.x,y=e.y-scene.camera.y,r=8+e.power*7+age*.035*e.power;return <G key={`e${e.id}`} opacity={life}><Circle cx={x} cy={y} r={r} fill={`${accent}24`} stroke={accent} strokeWidth={2+e.power*.5}/>{[0,1,2,3,4,5,6,7].map(i=>{const a=i*Math.PI/4,inner=r*.72,outer=r*(1.18+.18*e.power);return <Line key={i} x1={x+Math.cos(a)*inner} y1={y+Math.sin(a)*inner} x2={x+Math.cos(a)*outer} y2={y+Math.sin(a)*outer} stroke={i%2?fg:accent} strokeWidth={1.4+e.power*.4} strokeLinecap="round"/>})}</G>})}
 </Svg>;
}

function Ability({label,icon,disabled,bottom,onPress}:{label:string;icon:"my-location"|"gps-fixed"|"track-changes"|"flare"|"bolt";disabled?:boolean;bottom:number;onPress:()=>void}){const {activeTone,isDark}=useTheme();return <Pressable disabled={disabled} onPress={onPress} style={[S.ability,{bottom,backgroundColor:activeTone.accent,opacity:disabled?.48:1}]}><MaterialIcons name={icon} size={18} color={isDark?"#111113":"#fff"}/><Text style={{color:isDark?"#111113":"#fff",fontSize:9,fontWeight:"900"}}>{label}</Text></Pressable>}
function Overlay({title,body,retry,menu}:{title:string;body:string;retry:()=>void;menu:()=>void}){const {activeTone,isDark}=useTheme();return <View style={S.overlay}><Text style={S.overlayTitle}>{title}</Text><Text style={S.overlayText}>{body}</Text><View style={S.overlayBtns}><Pressable onPress={retry} style={[S.overlayBtn,{backgroundColor:activeTone.accent}]}><Text style={{color:isDark?"#111113":"#fff",fontWeight:"900"}}>Retry</Text></Pressable><Pressable onPress={menu} style={[S.overlayBtn,{backgroundColor:activeTone.bg4}]}><Text style={{color:isDark?"#edebea":"#2f3035",fontWeight:"900"}}>Menu</Text></Pressable></View></View>}

const S=StyleSheet.create({
 menu:{paddingHorizontal:20,paddingTop:8,paddingBottom:70},
 bonus:{minHeight:42,borderRadius:14,marginBottom:10,paddingHorizontal:13,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:7},
 top:{minHeight:44,flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:14},
 pill:{minHeight:38,borderRadius:12,borderWidth:1,flexDirection:"row",alignItems:"center",gap:6,paddingHorizontal:11},
 back:{minHeight:38,borderRadius:12,borderWidth:1,flexDirection:"row",alignItems:"center",gap:6,paddingHorizontal:11},
 hero:{paddingHorizontal:18,paddingVertical:20,alignItems:"center"},
 heroPlane:{width:154,height:116,borderRadius:26,alignItems:"center",justifyContent:"center",marginBottom:10},
 title:{fontSize:25,fontWeight:"900",textAlign:"center"},
 desc:{fontSize:11,lineHeight:17,textAlign:"center",marginTop:5},
 last:{minWidth:150,borderRadius:12,borderWidth:1,paddingHorizontal:12,paddingVertical:8,marginTop:14,alignItems:"center"},
 primary:{minHeight:52,borderRadius:15,marginTop:14,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:7},
 buttonRow:{flexDirection:"row",gap:8,marginTop:9},
 secondary:{flex:1,minHeight:48,borderRadius:15,borderWidth:1,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:7},
 full:{minHeight:58,borderRadius:15,borderWidth:1,marginTop:9,paddingHorizontal:14,flexDirection:"row",alignItems:"center"},
 tabs:{flexDirection:"row",gap:8,marginBottom:14},
 tab:{flex:1,minHeight:42,borderRadius:13,borderWidth:1,alignItems:"center",justifyContent:"center"},
 storeRow:{minHeight:112,flexDirection:"row",alignItems:"center",paddingHorizontal:13,paddingVertical:10},
 storeGraphic:{width:82,height:74,borderRadius:17,alignItems:"center",justifyContent:"center"},
 storeName:{fontSize:14,fontWeight:"900"},
 storeDesc:{fontSize:10,lineHeight:14,marginTop:3},
 buy:{minWidth:70,minHeight:38,borderRadius:12,borderWidth:1,alignItems:"center",justifyContent:"center",paddingHorizontal:8},
 upgrade:{minHeight:76,flexDirection:"row",alignItems:"center",gap:10,paddingHorizontal:14,paddingVertical:10},
 section:{fontSize:18,fontWeight:"900",marginTop:18,marginBottom:9},
 nitroRow:{minHeight:66,flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingHorizontal:14,paddingVertical:9},
 bossGrid:{flexDirection:"row",flexWrap:"wrap",gap:10,justifyContent:"space-between",marginTop:16},
 bossCard:{minHeight:150,alignItems:"center",justifyContent:"center",padding:12},
 bossName:{fontSize:15,fontWeight:"900",marginTop:6},
 embed:{flex:1,paddingHorizontal:20,paddingTop:8,paddingBottom:45},
 fullRoot:{flex:1},
 gameTop:{minHeight:56,flexDirection:"row",alignItems:"center",gap:10,marginBottom:6},
 close:{width:40,height:40,borderRadius:13,borderWidth:1,alignItems:"center",justifyContent:"center"},
 hearts:{flexDirection:"row",gap:2,paddingRight:4},
 bossHud:{marginBottom:7},
 bossHudTop:{flexDirection:"row",justifyContent:"space-between",marginBottom:4,paddingHorizontal:2},
 bossTrack:{height:8,borderRadius:999,overflow:"hidden"},
 bossFill:{height:"100%",borderRadius:999},
 arena:{alignSelf:"center",borderRadius:22,borderWidth:1,overflow:"hidden"},
 cloud:{position:"absolute",width:128,height:72},
 cloudBase:{position:"absolute",left:0,top:18,width:102,height:31,borderRadius:999,backgroundColor:"rgba(255,255,255,.15)"},
 cloudTop:{position:"absolute",left:34,top:0,width:61,height:46,borderRadius:999,backgroundColor:"rgba(255,255,255,.15)"},
 cloudRain:{position:"absolute",left:8,top:48,width:100,height:35},
 drop:{position:"absolute",top:0,width:2,height:17,borderRadius:2,backgroundColor:"rgba(220,235,255,.24)",transform:[{rotate:"10deg"}]},
 missileTrail:{position:"absolute",width:18,height:4,borderRadius:999,zIndex:8},
 missile:{position:"absolute",width:0,height:0,borderTopWidth:9,borderBottomWidth:9,borderLeftWidth:22,borderTopColor:"transparent",borderBottomColor:"transparent",zIndex:10},
 elite:{borderTopWidth:11,borderBottomWidth:11,borderLeftWidth:27},
 shot:{position:"absolute",width:12,height:5,borderRadius:999,zIndex:12},
 hunter:{width:14,height:7},
 bossBullet:{position:"absolute",width:8,height:8,borderRadius:999,zIndex:11},
 flare:{position:"absolute",width:10,height:10,borderRadius:999,zIndex:11},
 explosion:{position:"absolute",width:30,height:30,borderRadius:999,borderWidth:2,zIndex:13},
 bossSprite:{position:"absolute",zIndex:12},
 shield:{position:"absolute",width:62,height:62,borderRadius:999,borderWidth:2,zIndex:11,opacity:.72},
 shieldLocal:{position:"absolute",left:-1,top:-1,width:62,height:62,borderRadius:999,borderWidth:2,zIndex:11,opacity:.72},
 nitroParticle:{position:"absolute",width:15,height:4,borderRadius:999,zIndex:8},
 nitroParticleLocal:{position:"absolute",width:15,height:4,borderRadius:999,zIndex:8},
 planePos:{position:"absolute",width:60,height:60,alignItems:"center",justifyContent:"center",zIndex:14},
 joystick:{position:"absolute",left:18,bottom:18,width:110,height:110,borderRadius:999,borderWidth:1,alignItems:"center",justifyContent:"center",zIndex:25},
 knob:{width:42,height:42,borderRadius:999},
 ability:{position:"absolute",right:18,minWidth:82,height:56,borderRadius:17,alignItems:"center",justifyContent:"center",gap:1,zIndex:25},
 ace:{position:"absolute",left:18,top:18,minWidth:70,height:28,borderRadius:10,borderWidth:1,alignItems:"center",justifyContent:"center",zIndex:24},
 overlay:{...StyleSheet.absoluteFillObject,zIndex:50,backgroundColor:"rgba(0,0,0,.45)",alignItems:"center",justifyContent:"center",paddingHorizontal:24},
 overlayTitle:{fontSize:30,fontWeight:"900",color:"#fff"},
 overlayText:{fontSize:14,fontWeight:"800",marginTop:5,color:"#fff"},
 overlayBtns:{flexDirection:"row",gap:9,marginTop:18},
 overlayBtn:{minWidth:110,minHeight:44,borderRadius:13,alignItems:"center",justifyContent:"center",paddingHorizontal:14},
 credits:{...StyleSheet.absoluteFillObject,zIndex:55,backgroundColor:"rgba(1,4,10,.93)",alignItems:"center",justifyContent:"center",paddingHorizontal:26},
 creditsTitle:{fontSize:31,fontWeight:"900",marginTop:12,color:"#fff"},
 creditsText:{fontSize:13,marginTop:7,textAlign:"center",color:"#fff"},
 divider:{width:100,height:1,backgroundColor:"rgba(255,255,255,.24)",marginVertical:18},
 creditLine:{fontSize:12,fontWeight:"700",marginTop:5,textAlign:"center",color:"#fff"},
});
