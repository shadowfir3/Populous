const paths={
 atlas:'<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2zM9 3v16m6-14v16"/>',
 graph:'<path d="M3 3v17h18M6 15l4-5 4 2 6-7"/>',
 reset:'<path d="M4 9a8 8 0 1 1 0 7M4 3v6h6"/>',
 layers:'<path d="m3 8 9-5 9 5-9 5zM3 12l9 5 9-5M3 16l9 5 9-5"/>',
 eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="2.6"/>',
 pause:'<path d="M8 5v14M16 5v14" stroke-width="3.3"/>',
 play:'<path d="m7 4 12 8-12 8z" fill="currentColor" stroke="none"/>',
 expand:'<path d="M4 9V4h5m6 0h5v5m0 6v5h-5m-6 0H4v-5"/>',
 seed:'<path d="M19 4C9 3 4 7 5 13c1 6 10 9 14-9ZM5 20l10-12"/>',
 compass:'<circle cx="12" cy="12" r="9"/><path d="m16 8-2.5 5.5L8 16l2.5-5.5z"/>',
 land:'<path d="m2 19 7-12 4 7 3-5 6 10zM7 11l2 1 1.5-2"/>',
 water:'<path d="M2 8q3-3 6 0t6 0 7 0M2 13q3-3 6 0t6 0 7 0M2 18q3-3 6 0t6 0 7 0"/>',
 clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>',
 leaf:'<path d="M3 21c1-7 5-12 13-16M6 15C2 8 8 3 21 3c0 12-7 17-15 12Z"/>',
 check:'<path d="m4 12 5 5L20 6"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>',
 grid:'<rect x="3" y="3" width="18" height="18" rx="1"/><path d="M9 3v18m6-18v18M3 9h18M3 15h18"/>',
 save:'<path d="m3 3 15 0 3 3v15H3zM7 3v6h10V3M7 21v-8h10v8"/>',
 minus:'<path d="M5 12h14"/>',plus:'<path d="M5 12h14m-7-7v14"/>',
 people:'<circle cx="9" cy="9" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 6a3 3 0 0 1 0 6m2 3c2 0 3 2 3 5"/>',
 chevron:'<path d="m7 10 5 5 5-5"/>'
};
export function icon(name,size=16){return '<svg aria-hidden="true" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">'+paths[name]+'</svg>';}
export const mark='<svg width="39" height="39" viewBox="0 0 40 40" fill="none" aria-hidden="true"><rect width="40" height="40" rx="10" fill="#263e32"/><g stroke="#f2f1d8" stroke-width="1.35" stroke-linejoin="round"><path d="m5 26 7-8 5 3L24 9l11 17"/><path d="m6 29 7-7 5 3 6-10 10 14M7 32l7-6 5 2 5-7 9 11"/><path d="m11 32 4-3 5 2 4-5 5 6"/><circle cx="12" cy="11.6" r="2.5" fill="#e9c680" stroke="none"/></g></svg>';
// Each plate uses the same limited ink palette as its census marker.
const specimens=[
 ['                 1 1','    11111        1 1','   1222221      1221','  122333221    12221',' 12332233221   1221 ',' 12322323221  1221  ',' 1233222322111221   ','  12333322122221    ','111222222222221     ',' 1111111111111      '],
 ['         11       ','        12211     ','   1    1223211   ','   21  1222221111 ','  122112222211    ','   1222332221     ','11 122333221      ',' 1122333221       ','  11222211        ','    11111         ','     1 1          ','    11 11         '],
 ['          1   1   ','          21 12   ','         122221   ','         1232311  ','   111111122221   ','  122222222211    ',' 122332222221     ',' 122223322221     ','1122122211221     ','1 12 111 1 21     ','  11     1 11     '],
 ['              1 1   ','     111     1211   ','   112221111122221  ',' 1222232222222223111','1122212222332222211 ',' 11 122222222221    ','    12211222121     ','    121 111 121     ','   121      121     ','   11        11     '],
 ['         11        ','        12211    11','    11112222211 121','  11222222222211221',' 122322333222222221','1122222222222111221','  11222222211   121','     1111221     11','         11        '],
 ['          11  11  ','         12211221 ','     111122312231 ','   11222222222221 ','  122333222222221 ',' 122222232222211  ','122112222211211   ',' 122111111 1211   ','11111       11111 '],
 ['           1          ','          121         ','         12211       1','     111122222111   12','  11122222222222211121',' 11223222223322222221 ','112222222222222211121 ','   1111222222111   12 ','       112221       11','          121         ','           1          ']
];
export function animalArt(s,color) {
 const rows=specimens[s], width=Math.max(...rows.map(r=>r.length));
 let paths='';
 for(const [value,paint] of [['1','color-mix(in srgb,'+color+' 70%, #252e28)'],['2',color],['3','color-mix(in srgb,'+color+' 62%, #faf3db)']]){
   let d='';rows.forEach((r,y)=>[...r].forEach((c,x)=>{if(c===value)d+='M'+x+' '+y+'h1v1h-1z';}));
   paths+='<path fill="'+paint+'" d="'+d+'"/>';
 }
 return '<svg class="specimen" aria-hidden="true" viewBox="-1 -1 '+(width+2)+' '+(rows.length+2)+'" shape-rendering="crispEdges">'+paths+'</svg>';
}
