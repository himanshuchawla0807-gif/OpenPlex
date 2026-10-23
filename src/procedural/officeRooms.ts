import {arrangeFootprints} from './roomLayout.ts'
import type { Furniture, OfficeDefinition, Station } from './model.ts';

function chair(s:Station):Furniture { return {id:`${s.id}-chair`,kind:'chair',i:s.i-.48,j:s.j-.48,w:.96,d:.96,color:'#334964',orientation:s.facing===-1&&!s.reverse?'south':'east',reverse:s.reverse}; }
function office(data:OfficeDefinition):OfficeDefinition {
  data.furniture.push(...data.stations.filter(s=>s.surface==='desk').map(chair));
  return data;
}
function bench(id:string,i:number,j:number,seats=2):Furniture {
  return {id,kind:'bench',i,j,w:4.2,d:seats*2.7,color:'#ddd5c7'};
}
function benchSeats(f:Furniture,prefix:string,roles:string[]):Station[] {
  return Array.from({length:Math.round(f.d/2.7)},(_,n)=>[false,true].map(reverse=>({
    id:`${prefix}-${n}-${reverse?'far':'near'}`,i:reverse?f.i+f.w+.45:f.i-.45,j:f.j+1.3+n*2.7,
    facing:(reverse?-1:1) as 1|-1,reverse,surface:'desk' as const,furnitureId:f.id,role:roles[n%roles.length],
  }))).flat();
}
// Four colleagues along each uninterrupted, single-sided row. The rows run
// along j; the aisle separates them along i, rather than cutting the desktops.
const mainBench={...bench('main-shared-0',4.5,3,4),w:2.1,d:14.4,singleSided:true,color:'#faf9f5'},mainBenchBack={...bench('main-shared-0b',9.8,3,4),w:2.1,d:14.4,singleSided:true,reverse:true,color:'#faf9f5'};
function mainSeats():Station[]{
 return Array.from({length:4},(_,n)=>[mainBench,mainBenchBack].map((f,k)=>({id:`main-row-${k}-${n}`,i:k?f.i+f.w+.45:f.i-.45,j:4.3+n*3.9,facing:(k?-1:1) as 1|-1,reverse:Boolean(k),surface:'desk' as const,furnitureId:f.id,role:k?'Product':'Engineering'}))).flat();
}

function meetingSeats(prefix:string,furnitureId:string,i:number,j:number,w:number):Station[] {
  return [false,true].flatMap(reverse=>[0,1].map(n=>({id:`${prefix}-${reverse?'far':'near'}-${n}`,i:reverse?i+w+.45:i-.45,j:j+1.3+n*2.7,facing:(reverse?-1:1) as 1|-1,reverse,surface:'desk' as const,furnitureId,role:'Meeting'})));
}
interface Department {id:string;name:string;origin:{x:number;y:number};floor:string;wall:string;accent:string;seats:8|1;kind:string;roles:string[]}
function department(d:Department):OfficeDefinition {
  if(d.kind==='ceo') {
    const desk:Furniture={id:'ceo-desk',kind:'desk',i:8,j:9,w:3,d:3,color:'#b9997b'};
    const station:Station={id:'ceo-seat',i:7.55,j:10.3,facing:1,surface:'desk',furnitureId:desk.id,role:'Supreme head agent'};
    return office({id:d.id,name:d.name,origin:d.origin,width:20,depth:23,wallHeight:3.75,floor:d.floor,wall:d.wall,accent:d.accent,
      furniture:[{id:'ceo-rug',kind:'rug',i:5.5,j:7,w:8,d:7,color:d.floor},desk,
        {id:'ceo-office-library',kind:'bookcase',i:.18,j:3.1,w:.85,d:3.7,height:2.75},
        {id:'ceo-planning',kind:'planningboard',i:12,j:3.1,w:3,d:2.3,color:d.accent},
        {id:'ceo-archive',kind:'cabinet',i:12.7,j:.2,w:3.9,d:.8,color:d.accent},
        {id:'ceo-office-coffee',kind:'coffeebar',i:.2,j:12.2,w:.9,d:2.5},
        {id:'ceo-office-task-island',kind:'displaytable',i:12,j:7.2,w:3,d:2.25,color:d.accent},
        {id:'ceo-review',kind:'coffee',i:12,j:17.3,w:2,d:2.8},
        {id:'ceo-guests',kind:'sofa',i:9.5,j:17.3,w:1.5,d:3.5,color:d.accent}],
      stations:[station],walkPath:[{i:2.2,j:1.7},{i:16.5,j:1.7},{i:16.5,j:21.3},{i:2.2,j:21.3}]});
  }
  const shared=bench(`${d.id}-shared`,4.5,4,d.seats/2);
  shared.color='#faf9f5';
  if(d.kind==='strategy')shared.kind='conference';
  const f:Furniture[]=[
    {id:`${d.id}-work-rug`,kind:'rug',i:2.8,j:3,w:8.4,d:14.5,color:d.floor},shared,
    {id:`${d.id}-library`,kind:'bookcase',i:.18,j:3.1,w:.85,d:3.7,height:2.75},
    {id:`${d.id}-archive`,kind:'cabinet',i:12.7,j:.2,w:3.9,d:.8,color:d.accent},
    {id:`${d.id}-coffee`,kind:'coffeebar',i:.2,j:12.2,w:.9,d:2.5},
    {id:`${d.id}-water`,kind:'watercooler',i:2.4,j:13.4,w:.7,d:.7},
    {id:`${d.id}-task-island`,kind:'displaytable',i:12,j:7.2,w:3.8,d:2.25,color:d.accent},
    {id:`${d.id}-reading`,kind:'armchair',i:12,j:18.5,w:1.6,d:1.6,color:d.accent},
    {id:`${d.id}-side-table`,kind:'coffee',i:14.4,j:18.8,w:1.2,d:1.5},
  ];
  if(d.kind==='technical') {
    f.push(...[7.5,9,10.5].map((j,n)=>({id:`technical-server-${n}`,kind:'server',i:.2,j,w:.95,d:1.2,height:3.1})),{id:'technical-prototype',kind:'prototype',i:12.1,j:3.2,w:2.2,d:2.3});
  } else if(d.kind==='research') {
    f.push({id:'research-lab-equipment',kind:'prototype',i:12,j:3.1,w:2.7,d:2.4},{id:'research-cold-storage',kind:'lockers',i:.2,j:8,w:.95,d:2.5,height:2.7});
  } else if(d.kind==='marketing') {
    f.push({id:'marketing-campaigns',kind:'campaignboard',i:11.8,j:3.2,w:3.9,d:2.1},{id:'marketing-sample-storage',kind:'flatfiles',i:.2,j:8,w:1,d:2.5});
  } else if(d.kind==='design') {
    f.push({id:'design-materials',kind:'displaytable',i:11.8,j:3.2,w:3.8,d:2.1},{id:'design-flatfiles',kind:'flatfiles',i:.2,j:8,w:1,d:2.6});
  } else if(d.kind==='operations') {
    f.push({id:'operations-dispatch',kind:'server',i:12,j:3.1,w:3.2,d:2.2},{id:'operations-lockers',kind:'server',i:.2,j:8,w:.95,d:2.7,height:2.7});
  } else if(d.kind==='cafe') {
    f.push({id:'content-editing-console',kind:'mediaconsole',i:.2,j:7.8,w:1.1,d:3.5,height:2.95},{id:'cafe-sofa',kind:'sofa',i:4.4,j:17,w:1.5,d:3.5,color:'#b3785f'},{id:'content-recording-rig',kind:'contentrig',i:7,j:18.7,w:3.2,d:1.8,color:'#bc8754'});
  } else if(d.kind==='people') {
    f.push({id:'people-interview-sofa',kind:'sofa',i:4.3,j:16.8,w:1.5,d:3.5,color:'#9b829c'},{id:'people-interview-table',kind:'coffee',i:6.7,j:17.3,w:1.6,d:2.8},{id:'people-interview-chair',kind:'armchair',i:9.4,j:17.6,w:1.6,d:1.6,color:'#c1a2a6'});
  } else if(d.kind==='training') {
    f.push({id:'executive-planning',kind:'planningboard',i:12,j:3,w:2.7,d:2.3},{id:'executive-reference-library',kind:'bookcase',i:.18,j:8,w:.85,d:3.4,height:2.7},{id:'executive-project-review',kind:'displaytable',i:4.3,j:17.4,w:5.2,d:2.2});
  } else if(d.kind==='context') {
    f.push({id:'context-skills-library',kind:'bookcase',i:.18,j:8,w:.85,d:3.4,height:2.7},{id:'context-workbench',kind:'displaytable',i:12,j:3.1,w:2.7,d:2.3});

  } else {
    f.push({id:'strategy-model',kind:'prototype',i:12,j:3.1,w:2.7,d:2.3},{id:'strategy-sofa',kind:'sofa',i:4.4,j:17.2,w:1.5,d:3.4,color:'#8a8c60'},{id:'strategy-map',kind:'displaytable',i:7,j:17.5,w:3,d:2.6});
  }
  return office({id:d.id,name:d.name,origin:d.origin,width:20,depth:23,wallHeight:3.75,floor:d.floor,wall:d.wall,accent:d.accent,furniture:f,stations:benchSeats(shared,d.id,d.roles),walkPath:[{i:2.2,j:1.7},{i:10.5,j:1.7},{i:10.5,j:21.3},{i:2.2,j:21.3}]});
}
export const officeDefinitions:OfficeDefinition[]=[
  office({
    id:'connected-office',name:'Main office',origin:{x:0,y:0},width:26,depth:23,wallHeight:3.75,
    floor:'#c7cbd0',wall:'#edf0f2',accent:'#477aab',
    furniture:[
      {id:'bruno-activity-aisle',kind:'reservedlane',i:1.2,j:9.2,w:2.15,d:12},
      {id:'main-work-rug',kind:'rug',i:2.7,j:2.1,w:4.1,d:16.2,color:'#a8b4c0'},
      {id:'main-work-rug-back',kind:'rug',i:8.4,j:2.1,w:4.1,d:16.2,color:'#a8b4c0'},
      mainBench,mainBenchBack,
      {id:'main-library-a',kind:'bookcase',i:.18,j:3,w:.85,d:4.4,height:3.05},
      {id:'main-library-b',kind:'bookcase',i:.18,j:8,w:.85,d:4.4,height:3.05},
      {id:'main-print-hub',kind:'printer',i:.25,j:13.3,w:1,d:1.3},
      {id:'main-lockers',kind:'lockers',i:.18,j:15.4,w:.9,d:2.1,height:2.8},
      {id:'main-kitchen',kind:'kitchenette',i:.2,j:18.5,w:1.1,d:3.6,height:2.95},
      {id:'main-water',kind:'watercooler',i:2.5,j:19.4,w:.7,d:.7},
      {id:'main-archive',kind:'cabinet',i:15.8,j:.2,w:4.2,d:.8},
      {id:'main-storage',kind:'cabinet',i:21,j:.2,w:3.9,d:.8},
      {id:'main-meet-rug',kind:'rug',i:17.5,j:2,w:7,d:8,color:'#b5bfc9'},
      {id:'main-meeting-table',kind:'conference',i:19.2,j:3,w:3,d:5.6},
      {id:'main-meeting-glass',kind:'glass',i:17.3,j:2,w:.08,d:7.5},
      {id:'main-lounge-rug',kind:'rug',i:17.8,j:12,w:6.8,d:7.4,color:'#a6b2bd'},
      {id:'main-sofa',kind:'sofa',i:18.2,j:13.3,w:1.5,d:4.1,color:'#4e6883'},
      {id:'main-coffee',kind:'coffee',i:20.7,j:14,w:1.55,d:2.8},
      {id:'main-armchair',kind:'armchair',i:23,j:14.3,w:1.6,d:1.6,color:'#8c9da9'},
      {id:'main-team-coffee',kind:'coffeebar',i:24.1,j:17.2,w:.9,d:3.2},
      {id:'main-media',kind:'mediaconsole',i:23.8,j:10,w:1.3,d:2.7},
      {id:'main-game',kind:'foosball',i:9.2,j:19,w:3.2,d:1.8},
      {id:'main-front-library',kind:'bookcase',i:18.3,j:20.1,w:.85,d:2.2,height:1.4},
      {id:'main-sample-display',kind:'displaytable',i:5.2,j:19,w:2.2,d:1.8},
    ],
    stations:[...mainSeats(),...meetingSeats('main-meet','main-meeting-table',19.2,3,3)],
    walkPath:[{i:1.8,j:1.6},{i:16.5,j:1.6},{i:16.5,j:21.5},{i:1.8,j:21.5}],
  }),
  department({id:'collaboration-suite',name:'Technical department',origin:{x:0,y:-20.5},floor:'#c3d0d4',wall:'#e9f0ef',accent:'#3d8591',seats:8,kind:'technical',roles:['Platform engineering','Infrastructure']}),
  department({id:'research-lab',name:'Research lab',origin:{x:-21.5,y:0},floor:'#cad9cc',wall:'#ecf0e4',accent:'#6e9471',seats:8,kind:'research',roles:['Research experiments','Data science']}),
  department({id:'design-studio',name:'Design studio',origin:{x:29.5,y:0},floor:'#dccac5',wall:'#f2e9e0',accent:'#b77678',seats:8,kind:'design',roles:['Visual design','Prototyping']}),
  department({id:'team-lounge',name:'Content studio',origin:{x:0,y:26.5},floor:'#dfcfb6',wall:'#f4eddf',accent:'#bc8754',seats:8,kind:'cafe',roles:['Content production','Publishing preparation']}),
  department({id:'marketing-studio',name:'Marketing studio',origin:{x:-21.5,y:-20.5},floor:'#d9c7cf',wall:'#f4e8ee',accent:'#bc698b',seats:8,kind:'marketing',roles:['Campaign strategy','Content studio']}),
  department({id:'operations-hub',name:'Data office',origin:{x:21.5,y:-20.5},floor:'#c5d0da',wall:'#e7edf4',accent:'#6281b0',seats:8,kind:'operations',roles:['Data organization','Agent configuration']}),
  department({id:'people-studio',name:'HR department',origin:{x:-21.5,y:26.5},floor:'#d5cbd7',wall:'#f0eaf1',accent:'#9d7aa5',seats:8,kind:'people',roles:['Agent recruitment','Agent training']}),
  department({id:'learning-room',name:'Executive office',origin:{x:21.5,y:26.5},floor:'#cdd5bf',wall:'#f0f0df',accent:'#9b9c57',seats:8,kind:'training',roles:['Team coordination','Executive planning']}),
  department({id:'strategy-room',name:'Board meeting room',origin:{x:43,y:26.5},floor:'#d2cebb',wall:'#f1eddf',accent:'#8d9164',seats:8,kind:'strategy',roles:['Business strategy','Planning']}),
  department({id:'context-skills-office',name:'Context & skills office',origin:{x:52,y:0},floor:'#dbd2c2',wall:'#f4efe5',accent:'#9b805e',seats:8,kind:'context',roles:['Context management','Skill authoring']}),
  department({id:'ceo-office',name:'CEO office',origin:{x:46,y:-26},floor:'#d6c9ce',wall:'#f2e9ee',accent:'#82647d',seats:1,kind:'ceo',roles:['Head agent','Business oversight']}),
];

// The preset and user-added campuses share the same centered layout rules.
const placement=arrangeFootprints(officeDefinitions.map(d=>({...d,templateId:d.id})),officeDefinitions);
officeDefinitions.forEach((d,n)=>{d.origin=placement[n].origin});

/** Office purposes describe the business workflow, not autonomous permissions. */
export const departmentCapabilities:Record<string,string>={
 'connected-office':'A shared home for twelve agents working across the business.',
 'collaboration-suite':'Build software, AI products and technical infrastructure.',
 'research-lab':'Research products, evidence, customer needs and experiments.',
 'design-studio':'Create presentations, visual designs and prototypes.',
 'team-lounge':'Produce content and prepare publishing assets.',
 'marketing-studio':'Plan campaigns, audience research and marketing creative.',
 'operations-hub':'Organize business data, reference files and agent configuration.',
 'people-studio':'Recruit, configure and train agents for their roles.',
 'learning-room':'Coordinate department work and executive planning.',
 'strategy-room':'Review business strategy and decisions together.',
 'context-skills-office':'Manage agent context, maintain skills and author new skills.',
 'ceo-office':'A home for the head agent to review business priorities across departments. Delegation requires configured agent tools and permissions.',
};
