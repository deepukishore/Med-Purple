"""Rebuild original silent teaching videos and brand icons. Requires Pillow + ffmpeg."""
from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
import subprocess,math
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'backend/app/media';OUT.mkdir(parents=True,exist_ok=True)
FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
def font(n,bold=False):return ImageFont.truetype(BOLD if bold else FONT,n)
def wrap(draw,text,f,maxwidth):
 lines=['']
 for word in text.split():
  candidate=(lines[-1]+' '+word).strip()
  if draw.textlength(candidate,font=f)>maxwidth and lines[-1]:lines.append(word)
  else:lines[-1]=candidate
 return lines
def textblock(d,txt,xy,size=24,fill='#FFFFFF',width=454,bold=False):
 f=font(size,bold);x,y=xy
 for line in wrap(d,txt,f,width):d.text((x,y),line,font=f,fill=fill);y+=size*1.42
 return y
TOPICS={
'conduction':{'subject':'Physiology','title':'Follow the heartbeat','steps':['The SA node starts the impulse.','The AV node briefly delays conduction.','The AV bundle connects atria and ventricles.','Bundle branches and Purkinje fibers distribute the impulse.'],'labels':['SA node','AV node','AV bundle','Purkinje network']},
'nephron':{'subject':'Anatomy','title':'Meet the renal corpuscle','steps':['A glomerulus is a tuft of capillaries.','The glomerular capsule surrounds the tuft.','Filtrate enters the capsular space.','Next stop: the proximal convoluted tubule.'],'labels':['Glomerulus','Capsule','Capsular space','Proximal tubule']},
'gas-exchange':{'subject':'Physiology','title':'A breath, explained','steps':['Alveolar air and blood meet across a thin barrier.','Oxygen moves from alveolar air into blood.','Carbon dioxide moves from blood into alveolar air.','Each gas follows its own partial-pressure gradient.'],'labels':['Alveolus','Oxygen','Carbon dioxide','Diffusion']}}
W,H,FPS,DURATION=540,810,24,18
for slug,info in TOPICS.items():
 proc=subprocess.Popen(['ffmpeg','-y','-loglevel','error','-f','rawvideo','-vcodec','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-an','-c:v','libx264','-preset','fast','-crf','24','-pix_fmt','yuv420p','-movflags','+faststart',str(OUT/f'{slug}.mp4')],stdin=subprocess.PIPE)
 for n in range(FPS*DURATION):
  t=n/FPS;step=min(3,int(t/4.5));im=Image.new('RGB',(W,H),'#35204F');d=ImageDraw.Draw(im)
  d.text((38,35),'med purple / MedBytes',font=font(17,True),fill='#CAB7F0')
  d.rounded_rectangle((38,87,226,118),radius=8,fill='#4B267E');d.text((51,93),info['subject'],font=font(14,True),fill='#E6DDF9')
  textblock(d,info['title'],(38,141),37,bold=True,width=458)
  accent='#EDBA57';base='#CAB7F0'
  if slug=='conduction':
   nodes=[(123,305),(245,378),(278,451),(197,524),(370,524)]
   for a,b in [(0,1),(1,2),(2,3),(2,4)]:d.line([nodes[a],nodes[b]],fill='#8052CE',width=9)
   for j,(x,y) in enumerate(nodes):
    active=j==step or (step==3 and j>=3);rad=14+(3*math.sin(t*4) if active else 0);d.ellipse((x-rad,y-rad,x+rad,y+rad),fill=accent if active else base)
   d.text((145,290),'SA',font=font(21,True),fill=base);d.text((264,358),'AV',font=font(21,True),fill=base)
   d.text((294,437),'Bundle',font=font(19),fill=base);d.text((175,553),'Purkinje network',font=font(20),fill=base)
  elif slug=='nephron':
   d.arc((102,294,390,562),15,345,fill=accent if step==1 else base,width=12)
   for j in range(6):
    x=159+j*25;y=371+25*math.sin(j*2);d.ellipse((x-26,y-28,x+28,y+46),outline=accent if step==0 else '#C97485',width=10)
   d.line([(364,442),(420,442),(441,480),(420,527),(447,556)],fill=accent if step==3 else base,width=15,joint='curve')
   if step==2:
    for j in range(6):
     angle=j*.5+2;cx=246+110*math.cos(angle);cy=428+100*math.sin(angle);d.ellipse((cx-6,cy-6,cx+6,cy+6),fill=accent)
   d.text((141,586),'Schematic cross-section',font=font(17),fill=base)
  else:
   d.rounded_rectangle((53,308,487,400),radius=30,outline=base,width=3);d.text((151,338),'Alveolar air',font=font(23,True),fill=base)
   d.line((53,452,487,452),fill='#9B77DE',width=5);d.line((53,465,487,465),fill='#9B77DE',width=5)
   d.rounded_rectangle((53,514,487,597),radius=30,outline='#C97485',width=3);d.text((172,540),'Capillary',font=font(23,True),fill=base)
   for x,sgn,label in [(166,1,'O2'),(374,-1,'CO2')]:
    y=456+sgn*math.sin(t*2)*39;active=(sgn==1 and step==1)or(sgn==-1 and step==2)or step==3
    col=accent if active else base;d.line((x,413 if sgn==1 else 501,x,501 if sgn==1 else 413),fill=col,width=4)
    end=501 if sgn==1 else 413;d.polygon([(x,end),(x-8,end-sgn*12),(x+8,end-sgn*12)],fill=col);d.text((x+16,y-12),label,font=font(21,True),fill=col)
  d.rounded_rectangle((30,637,510,754),radius=17,fill='#4B267E');d.text((48,650),f'0{step+1} / '+info['labels'][step],font=font(17,True),fill=accent);textblock(d,info['steps'][step],(48,683),20,width=443)
  d.rectangle((38,783,502,786),fill='#7040B8');d.rectangle((38,783,38+464*t/DURATION,786),fill=accent)
  if n==0:im.save(OUT/f'{slug}.webp',quality=86)
  proc.stdin.write(im.tobytes())
 proc.stdin.close();assert proc.wait()==0
 lines=['WEBVTT','']
 for i,caption in enumerate(info['steps']):
  start=i*4.5;end=(i+1)*4.5
  stamp=lambda v:f'00:{int(v//60):02d}:{int(v%60):02d}.{int(v%1*1000):03d}'
  lines.extend([f'{stamp(start)} --> {stamp(end)}',caption,''])
 (OUT/f'{slug}.vtt').write_text('\n'.join(lines))
 print(slug,'generated',flush=True)
for size in [64,180,192,512,1024]:
 im=Image.new('RGBA',(1024,1024),'#7040B8');d=ImageDraw.Draw(im)
 d.line([(245,707),(245,345),(282,333),(511,626),(743,333),(779,345),(779,707)],fill='white',width=109,joint='curve')
 im=im.resize((size,size),Image.Resampling.LANCZOS)
 if size==180:im.save(ROOT/'web/public/apple-touch-icon.png')
 elif size==1024:im.save(ROOT/'mobile/assets/icon.png');im.save(ROOT/'mobile/assets/splash.png')
 else:im.save(ROOT/f'web/public/icon-{size}.png')
print('Icons generated',flush=True)
