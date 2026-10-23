export interface IllustrationPoint {x:number;y:number}
/** Bake cubic silhouettes to a small error in illustration coordinates. This
 * keeps facial/hair edges smooth in both close portraits and live GPU meshes. */
export function illustrationContour(points:readonly number[][],tension=.15,tolerance=.035):IllustrationPoint[] {
  const result:IllustrationPoint[]=[]
  const middle=(a:IllustrationPoint,b:IllustrationPoint)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2})
  const flat=(p:IllustrationPoint,a:IllustrationPoint,b:IllustrationPoint)=>Math.abs((b.x-a.x)*(a.y-p.y)-(a.x-p.x)*(b.y-a.y))/(Math.hypot(b.x-a.x,b.y-a.y)||1)
  const split=(a:IllustrationPoint,b:IllustrationPoint,c:IllustrationPoint,d:IllustrationPoint,depth=0)=>{
    if(depth===8||Math.max(flat(b,a,d),flat(c,a,d))<=tolerance){result.push(a);return}
    const ab=middle(a,b),bc=middle(b,c),cd=middle(c,d),abc=middle(ab,bc),bcd=middle(bc,cd),center=middle(abc,bcd)
    split(a,ab,abc,center,depth+1);split(center,bcd,cd,d,depth+1)
  }
  points.forEach(([x,y],k)=>{
    const before=points[(k+points.length-1)%points.length],next=points[(k+1)%points.length],after=points[(k+2)%points.length]
    split({x,y},{x:x+(next[0]-before[0])*tension,y:y+(next[1]-before[1])*tension},{x:next[0]-(after[0]-x)*tension,y:next[1]-(after[1]-y)*tension},{x:next[0],y:next[1]})
  })
  return result
}
