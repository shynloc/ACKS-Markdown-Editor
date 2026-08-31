from pathlib import Path
import json
r=Path(__file__).resolve().parents[1]
# Purpose-built editorial vector ornaments. No authored prose, external URLs, or shared raster motif.
shapes={
'gold':('<path d="M68 50h104M82 58h76M96 66h48M82 42h76M96 34h48"/><path d="m120 7 15 19-15 19-15-19Z" fill="#777777"/><path d="M120 2v6M92 14l7 7M148 14l-7 7"/>','阶梯金箔 / Art Deco'),
'blue':('<path d="M24 16v45h192M28 30h178M28 45h178M60 20v46M100 20v46M140 20v46M180 20v46" opacity=".25"/><path d="M30 61 78 48 123 51 168 25 210 15" stroke-width="2"/><circle cx="168" cy="25" r="4" fill="#777777"/><path d="M18 17h12M24 11v12M204 67h12M210 61v12"/>','坐标蓝图'),
'dark':('<circle cx="120" cy="39" r="25" fill="#111111" stroke="none"/><path d="M120 14a25 25 0 0 1 0 50" stroke-width="3"/><ellipse cx="120" cy="39" rx="78" ry="14" transform="rotate(-13 120 39)"/><circle cx="192" cy="22" r="3" fill="#777777"/>','日蚀轨道'),
'clean-green':('<path d="M120 66V48M120 50C86 58 59 43 57 13c32 2 57 12 63 37ZM120 48c5-32 29-44 56-39 2 26-21 43-56 39Z"/><path d="m63 18 52 28m52-29-42 29" opacity=".5"/>','双叶抽芽'),
'red-white':('<path d="M36 24V12h28M176 12h28v12M36 54v12h28M176 66h28V54" stroke-width="3"/><path d="M66 29h108M66 38h77M66 47h95"/><rect x="184" y="32" width="12" height="12" fill="#777777" stroke="none"/>','新闻裁切与铅条'),
'graphite':('<rect x="66" y="14" width="23" height="49" fill="#111111" stroke="none"/><rect x="94" y="30" width="23" height="33" fill="#777777" stroke="none"/><rect x="122" y="46" width="52" height="17" fill="#111111" stroke="none"/><path d="M66 70h108"/>','瑞士阶构'),
'zen':('<ellipse cx="117" cy="43" rx="81" ry="25" opacity=".22"/><ellipse cx="117" cy="43" rx="64" ry="18" opacity=".35"/><ellipse cx="117" cy="43" rx="45" ry="11" opacity=".5"/><path d="M116 44c-13 2-24-4-17-14 6-12 20-13 28-4 8 9 5 16-11 18Z" fill="#777777" stroke="none"/><path d="M141 53c-9 2-16-3-11-8 6-7 15-6 18 0 3 5-2 7-7 8Z" fill="#111111" stroke="none"/>','枯山水砂纹与置石'),
'receipt':('<path d="M35 18h170M35 61h170" stroke-dasharray="2 4"/><path d="M56 28v24M62 28v24M69 28v24M79 28v24M91 28v24M95 28v24M111 28v24M121 28v24M127 28v24M140 28v24M149 28v24M155 28v24M171 28v24M181 28v24" stroke-width="3"/><path d="M35 27v26M205 27v26"/>','打孔票据与条码'),
'olive-notes':('<path d="M30 57c23-43 36-28 56-30s33-24 58-18 40 24 66 17M33 66c25-45 43-31 63-32s34-24 55-14 29 22 54 15M59 67c20-32 37-21 50-27s27-18 42-7 28 17 53 14M89 67c13-18 23-13 34-17s15-12 26-4 27 13 48 13"/><circle cx="137" cy="28" r="4" fill="#777777" stroke="none"/>','田野等高线'),
'ms-blue-purple':('<path d="M65 12h42v26H81v26H55V38h10Z" fill="#777777" stroke="none"/><path d="M133 12h42v26h10v26h-26V38h-26Z" fill="#aaaaaa" stroke="none"/><path d="M105 52h30M113 44l-8 8 8 8M127 44l8 8-8 8"/>','双墨矩阵榫接'),
'dopamine':('<circle cx="67" cy="34" r="20" fill="#777777" stroke="none"/><path d="m105 12 42 42-54 6Z" fill="#aaaaaa" stroke="none"/><path d="M163 16c31 0 31 43 0 43" stroke-width="13"/><circle cx="199" cy="62" r="5" fill="#111111" stroke="none"/>','跳色圆弧积木'),
'song-ink':('<path d="M106 38h28l-3 9c0 9 11 11 9 18-4 10-36 10-40 0-2-7 9-9 9-18Z" fill="#eeeeee"/><path d="M119 39c-3-10-4-23 2-33m-4 18-17-9m17 18 26-19"/><path d="M107 71h26"/><circle cx="99" cy="15" r="4" fill="#aaaaaa" stroke="none"/><circle cx="145" cy="13" r="4" fill="#aaaaaa" stroke="none"/><circle cx="121" cy="7" r="3" fill="#aaaaaa" stroke="none"/>','青瓷小瓶与疏梅'),
'neu-soft':('<defs><linearGradient id="fold" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#eeeeee"/><stop offset="1" stop-color="#777777" stop-opacity=".45"/></linearGradient></defs><path d="M83 11h74v56H83Z" fill="url(#fold)" stroke="none"/><path d="m157 11-23 23h23Z" fill="#eeeeee"/><path d="M93 53h37M93 59h27" opacity=".4"/>','柔纸折角浮雕'),
'neo-brutalism':('<path d="m101 8 11 19 22-14-3 23 27 2-20 15 10 18-23-6-11 14-6-22-27 2 15-17-14-17 23 2Z" fill="#777777" stroke="#111111" stroke-width="2"/><path d="m159 14 26 26-26 26" stroke="#111111" stroke-width="7"/>','锯齿剪纸与硬折线'),
'maximalism':('<path d="M40 30c12-24 27-24 39 0s27 24 39 0 27-24 39 0 27 24 43 0M40 50c12-24 27-24 39 0s27 24 39 0 27-24 39 0 27 24 43 0" stroke-width="9"/><path d="M39 40h164" stroke="#aaaaaa" stroke-width="3"/>','双色波纹织带'),
'guochao':('<path d="M42 49V24h31v20H59V34h6M198 49V24h-31v20h14V34h-6M75 56h90M92 42c-13 0-14-17-2-20 5-14 24-10 28 0 17-11 34 3 26 15 18-2 17 19 2 19" stroke-width="2"/><path d="M87 64h65M116 8h8" stroke="#aaaaaa" stroke-width="3"/>','朱砂云雷回纹'),
'dreamglow':('<defs><linearGradient id="petal"><stop stop-color="#777777"/><stop offset="1" stop-color="#aaaaaa"/></linearGradient></defs><g stroke="url(#petal)" fill="none" opacity=".8"><ellipse cx="120" cy="39" rx="38" ry="13"/><ellipse cx="120" cy="39" rx="38" ry="13" transform="rotate(60 120 39)"/><ellipse cx="120" cy="39" rx="38" ry="13" transform="rotate(120 120 39)"/></g><circle cx="120" cy="39" r="6" fill="#eeeeee"/><circle cx="65" cy="23" r="2"/><circle cx="180" cy="53" r="3"/>','浮光彩窗花结'),
'ms-clean':('<path d="M120 25c-22-14-45-14-61-8v43c23-5 43 0 61 9 18-9 38-14 61-9V17c-16-6-39-6-61 8Z"/><path d="M120 25v44M72 29c13-2 24 1 36 7M72 40c13-2 24 1 36 7M132 36c12-6 23-9 36-7M132 47c12-6 23-9 36-7" opacity=".5"/>','展开的书页'),
'ms-business':('<path d="m52 24 68-19 68 19ZM60 67h120M66 31v29M92 31v29M118 31v29M144 31v29M170 31v29M54 73h132" stroke-width="3"/>','报告柱廊'),
'ms-technical':('<path d="M43 39h53v-22h57M96 39v22h57M153 17h39M153 61h39M120 39h72"/><circle cx="43" cy="39" r="5" fill="#777777"/><rect x="147" y="11" width="12" height="12" fill="#eeeeee"/><rect x="147" y="55" width="12" height="12" fill="#eeeeee"/><circle cx="192" cy="39" r="4"/>','协议分支电路'),
'ms-darkcode':('<path d="m62 22 22 17-22 17M100 57h47" stroke-width="5"/><rect x="165" y="18" width="15" height="42" fill="#777777" stroke="none"/>','终端光标'),
'ms-social':('<path d="M59 15h88a14 14 0 0 1 14 14v13a14 14 0 0 1-14 14h-38L88 72V56H59a14 14 0 0 1-14-14V29a14 14 0 0 1 14-14Z" fill="#eeeeee"/><path d="M161 27h20a13 13 0 0 1 13 13v18l10 13-25-5h-35" stroke="#aaaaaa"/><circle cx="80" cy="35" r="3"/><circle cx="103" cy="35" r="3"/><circle cx="126" cy="35" r="3"/>','交错对话气泡'),
'ms-academic':('<path d="m84 66 40-59 39 59ZM124 7v59M84 66l59-29"/><path d="M114 66V56h10M119 21a14 14 0 0 1 12 2"/><circle cx="124" cy="7" r="3" fill="#777777"/><circle cx="84" cy="66" r="3" fill="#777777"/><circle cx="163" cy="66" r="3" fill="#777777"/>','几何证明图'),
'ms-wechat':('<path d="M62 19h93v45H62Z"/><path d="M78 29h48M78 39h61M78 49h37"/><path d="M153 10h21v61l-10-9-11 9Z" fill="#777777" stroke="none"/>','文章书签'),
'ms-magazine':('<path d="M72 8v61M47 20l50 36M47 56l50-36" stroke-width="7"/><path d="M127 13h63M127 27h40M127 55h63M127 69h24" stroke="#aaaaaa" stroke-width="3"/>','杂志星标与栏线'),
'ms-aireport':('<path d="m120 8 40 30-40 30-40-30Zm0 0v60M80 38h80M62 17l18 21-18 21M178 17l-18 21 18 21"/><g fill="#777777" stroke="none"><circle cx="120" cy="8" r="4"/><circle cx="160" cy="38" r="4"/><circle cx="120" cy="68" r="4"/><circle cx="80" cy="38" r="4"/><circle cx="120" cy="38" r="6"/></g>','推理节点菱网'),
'ms-euro':('<path d="M120 57C88 37 87 12 68 15s-9 29 3 18c13-12-19-27-24-8-7 25 34 49 73 32Zm0 0c32-20 33-45 52-42s9 29-3 18c-13-12 19-27 24-8 7 25-34 49-73 32Z"/><path d="M120 23v43m-7-50 7-9 7 9-7 9Z" fill="#777777"/>','古典莨苕卷叶'),
'ms-cnclassic':('<path d="M81 10h78v58H81ZM87 16h66v46H87ZM98 16v46M142 16v46M87 29h66M87 49h66"/><path d="m120 26 13 13-13 13-13-13Z" fill="#eeeeee"/>','中式菱格窗棂'),
'ms-cnvertical':('<path d="M88 8h64v62H88Z"/><path d="M99 8v62M93 15h12M93 28h12M93 41h12M93 54h12M93 66h12M112 21v35M126 21v23M140 21v35"/>','线装书穿线'),
'ms-poster':('<circle cx="109" cy="39" r="30" fill="#777777" stroke="none"/><path d="M74 16h70M70 25h81M66 34h89M65 43h90M70 52h81M77 61h68" stroke="#111111" stroke-width="3"/><path d="m167 13-12 51 25-4" stroke-width="7"/>','网点圆与斜切版痕'),
}
for key,(body,_) in shapes.items():
 svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" width="240" height="80" fill="none" stroke="#777777" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">'+body+'</svg>'
 (r/'src/theme-signatures'/f'{key}.svg').write_text(svg)
meta={k:{'type':'svg','name':v[1],'file':f'{k}.svg'} for k,v in shapes.items()}
meta['y3k']={'type':'image','name':'液态玻璃结','asset':'glass-ribbon'}
meta['collage']={'type':'image','name':'手撕纸边','asset':'paper-edge'}
(r/'src/theme-signatures.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2))
print('Distinct signature families:',len(meta))
