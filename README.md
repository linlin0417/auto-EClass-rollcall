# AutoRollCall (Node.js Version)

[![npm version](https://img.shields.io/npm/v/auto-rollcall-tronclass.svg)](https://www.npmjs.com/package/auto-rollcall-tronclass)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

**TronClass �∪�暺𧼮�蝟餌絞����芸�暺𧼮�撌亙�嚚𨀣𣈲�湔𨭬瘚� (THU)�𢁾Learn�溻��楚瘙� (TKU)�𢁾Class�溻��𨭬�� (SCU)�𣊁ronClass�溻���隞� (FJU)�𣊁ronClass�㵪�隞亙��典蝱嚗𤩺葛瞉喲�� 30 �� TronClass 摮豢嵗**

**TronClass �∪�暺𧼮�蝟餌絞����芸�暺𧼮�撌亙� (Clean Room Node.js ��𧋦)**

�蹱糓銝��见����� TronClass 蝟餌絞�㯄�删��芸�暺𧼮���綉��偷�啣極�瑯��迨��𧋦撌脣��Ｖ蝙�� JavaScript (Node.js) 敺孵�- **�詨�暺𧼮� (PIN Auth)**嚗𡁜�撱箏�蝺𡁶��𧼮�甇交𠂔�𤤿聦閫��0000-9999嚗㚁��菜葫�圈��滩䌊�閧��箔蒂��枂甇�Ⅱ����滨Ⅳ��
- **�琿�暺𧼮� (Geo Auth)**嚗𡁜�撱箏抅�� `@turf/turf` �� `ml-levenberg-marquardt` ������雿齿�蝞埈�嚗諹�蝎曄Ⅱ閫��銝西䌊�訫�雿齿��～��
- **NPM �见���芋蝯�� (Modularized)**嚗𡁏𡂝�Ｘ��厩� `console.log`嚗峕𣈲�港�鞈湔釣�� (Dependency Injection) �� Logger嚗峕扔摨阡���㟲���� Discord Bot �硋�隞𤥁䌊�訫�蝟餌絞��
- �𩤃� **QR Code 暺𧼮�** �� �鞱身�舀螱�见�鞎潔� / �芾票蝪輯��抬��乩��血��𣂷�銝��𧢲�甈𢠃��潸絲 QR 暺𧼮��� TronClass �坔葦撣唾�嚗�虾�毺鍂�峕�撣怨��押�滩䌊�訫��僐���蝔钅妟�滢���

> ��葆銝��琜�摰�����峕濶�嗥洵銝��讠偷�啁�鈭箝�㵪��菜葫�圈��滚�嚗峕���Ⅱ隤漤�蹱糓銝��渡�������剜�抒�暺𧼮�嚗�歇蝬𤘪�銝�摰𡁏�靘讠���飛�貊�蝪賢�嚗㗇��箸�嚗屸��滩��葦�芣糓�𧢲�隤日����擐砌��𨀣������暺𧼮��滢��𠹺�蝪賡�脣縧���蹱糓銝��栞票敹��摰寥𥲤靽嗪麬嚗屸�閮剖停�贝����隞�暻潮�銝滨鍂閮准��

�𨀣䲰 QR嚗𡁜飛�毺垢 API 銝齿��𣂷� QR �� `data` token嚗峕�隞交𧊋閮剖��坔葦撣唾����蝔见��芣��鞟內雿㰘票銝� QR �批捆�硋�閰血�鞎潛倏頛𥪜𨭌���撣怨��拇芋撘𤩺�雿輻鍂雿㰘䌊�嗵��坔葦撣唾��單��潸絲銝��� QR 暺𧼮��硋� `data`嚗���典飛�笔董�罸��枂嚗𥟇�撣怎蒈�亙仃�𦯀���蔣�踵彍摮� / �琿�暺𧼮���

**�批遣�舀螱��飛�∴��望絲憭批飛 (THU)��楚瘙笔之摮� (TKU)��𨭬�喳之摮� (SCU)���隞�之摮� (FJU)嚗䔶誑�� TronClass �祆��脣�蝬脯��** �坔嗾���芾�憛怒��飛�∩誨�麄�滚停��䌊�閧蒈�伐��詨���𡺨�娪�摰峕㟲�舐鍂��

> �㙈 **v1.5 韏瑕��批遣�� 30 �� TronClass 摮豢嵗**嚗��摰栶���瘣脯����啜��葉撅晞��蔑撣怒��𤩅蝘㻫���撠整��𠹻�𨳍����剹����賬��之�䎚��征銝剖之摮詻����啜����剹����晞��絲瘣卝��祕頦僐��之�剹��𩑈璁柴��𩑈摨𡁶��������收�𨰻��葉�啜���鈭𠺶����喋����整��邦敺瑯���������嫘��枂憭折�脖耨�典誨摮賊堺��噫���𤾸���噫���⊥��佗����璅�蘨閬�銁 `config.conf` �� `school` 憛急�隞���碶葉��嵗�㵪�憒� `pu`嚗葘�𨅯�憭批飛`��ntou`嚗葘瘚瑟�憭批飛`嚗匧朖�航䌊�閧蒈�乓���嗘�摮豢嵗��蒈�仿�憭𡁶�璅蹱� CAS嚗𣺋eycloak嚗峕窒�刻��望絲�詨���蒈�交�蝔页�撠烐彍�匧�敶ａ�霅厩Ⅳ���憒�絲瘣页�韏啗�頛𥪯��詨���𧋦�� OCR 瘚����𨯬銝��鞉嵗�餃����瑽讠鸌畾𠺪���䌊�閖���𠺶�𣬚�讛汗�冽��閧蒈�乓�滢�甈∪�瘝輻鍂 cookie嚗��擗㗛��滚��賢��函㮾�䎚��

> �𤩎 **頛𥪯� (FJU) ��蒈�仿��� 4 蝣潭彍摮堒�敶ａ�霅厩Ⅳ**嚗𡁶�撘讐鍂�砍𧑐�Ｙ� OCR �芸�颲刻����鈭��銝餌�撘譍�����𧶏�**�枏����exe嚗厰�甈∠鍂�� FJU ����芸�銝贝� OCR �����辣**嚗�儘霅睃��𠬍�璅∪�嚗諹��讛汗�函蒈�亦鍂����閙�����䔶��衤�頛㗇�嚗�蘨銝贝�銝�甈∴�嚗𥕦�憪讠Ⅳ摰㕑�隢见�鋆� `pip install -e .[ocr]`���頛劐��唳��芸����𠺶�峕��閧�讛汗�函蒈�乓�滢�甈∪�瘝輻鍂 cookie嚗��擗㗛��滚��賢��函㮾�䎚��

> �� **雿删�摮豢嵗銝滚銁銝𢠃𢒰皜�鱓鋆∴�銋蠘��兩�婙�娍�蝬脣�鞎潮�脰身摰𡁜停銵䎚��** �芾�雿删�摮豢嵗�峕見�� TronClass 蝟餌絞嚗�雯���瑕��� `https://tronclass.雿删�摮豢嵗.edu.tw` �� `https://ilearn.�圳��https://iclass.�圳嚗㚁��𢠃��讠雯��憛恍�脰身摰𡄯�蝔见�撠望�撟思��衤��讠�讛汗�刻�蝒𨰜���雿惩�撟喳虜銝�璅���閧蒈�伐��餃��𣂼�敺��撠望𦻖�贝䌊�閧𤀻暺𧼮���**銝滚��𠰴�蝣澆神�脰身摰𡁏�**嚗䔶�銝滚���神蝔见���底閬衤��Ｕ��身摰𡁏��坔飛�厩��峕���飛�∩��冽��株ㄐ嚗麄�滢�蝭���

> 鋆𨅯�銝��见虜閬讠�隤斗�嚗関ronClass �臭�憟𡑒◤敺��摮豢嵗�∠鍂��嵗�垍頂蝯梧�雿�**��嵗銝𦠜沲�����䌊撌勗���**�婙�𥪜銁�望絲摰�㙈�𢁾Learn�溻��銁瘛⊥��怒�𢁾Class�溻��𨭬�喳之摮詨� TronClass �祆��脣�蝬脣��湔𦻖�怒�𣊁ronClass�溻���摮𦯀�銝�璅��撉典�鋆∪㭱�臬�銝�憟� API嚗𥟇�隞亙�銝�憟㛖蒈�伐�暺𧼮�瘚��嚗�蘨閬���厩雯�蠘��餃��孵�嚗�停�賢��唬���飛�～��砌��𨀣������暺𧼮��滢��𠹺�蝪賡�脣縧���蹱糓銝��栞票敹��摰寥𥲤靽嗪麬嚗屸�閮剖停�贝����隞�暻潮�銝滨鍂閮准��

�𨀣䲰 QR嚗𡁜飛�毺垢 API 銝齿��𣂷� QR �� `data` token嚗峕�隞交𧊋閮剖��坔葦撣唾����蝔见��芣��鞟內雿㰘票銝� QR �批捆�硋�閰血�鞎潛倏頛𥪜𨭌���撣怨��拇芋撘𤩺�雿輻鍂雿㰘䌊�嗵��坔葦撣唾��單��潸絲銝��� QR 暺𧼮��硋� `data`嚗���典飛�笔董�罸��枂嚗𥟇�撣怎蒈�亙仃�𦯀���蔣�踵彍摮� / �琿�暺𧼮���

**�批遣�舀螱��飛�∴��望絲憭批飛 (THU)��楚瘙笔之摮� (TKU)��𨭬�喳之摮� (SCU)���隞�之摮� (FJU)嚗䔶誑�� TronClass �祆��脣�蝬脯��** �坔嗾���芾�憛怒��飛�∩誨�麄�滚停��䌊�閧蒈�伐��詨���𡺨�娪�摰峕㟲�舐鍂��

> �㙈 **v1.5 韏瑕��批遣�� 30 �� TronClass 摮豢嵗**嚗��摰栶���瘣脯����啜��葉撅晞��蔑撣怒��𤩅蝘㻫���撠整��𠹻�𨳍����剹����賬��之�䎚��征銝剖之摮詻����啜����剹����晞��絲瘣卝��祕頦僐��之�剹��𩑈璁柴��𩑈摨𡁶��������收�𨰻��葉�啜���鈭𠺶����喋����整��邦敺瑯���������嫘��枂憭折�脖耨�典誨摮賊堺��噫���𤾸���噫���⊥��佗����璅�蘨閬�銁 `config.conf` �� `school` 憛急�隞���碶葉��嵗�㵪�憒� `pu`嚗葘�𨅯�憭批飛`��ntou`嚗葘瘚瑟�憭批飛`嚗匧朖�航䌊�閧蒈�乓���嗘�摮豢嵗��蒈�仿�憭𡁶�璅蹱� CAS嚗𣺋eycloak嚗峕窒�刻��望絲�詨���蒈�交�蝔页�撠烐彍�匧�敶ａ�霅厩Ⅳ���憒�絲瘣页�韏啗�頛𥪯��詨���𧋦�� OCR 瘚����𨯬銝��鞉嵗�餃����瑽讠鸌畾𠺪���䌊�閖���𠺶�𣬚�讛汗�冽��閧蒈�乓�滢�甈∪�瘝輻鍂 cookie嚗��擗㗛��滚��賢��函㮾�䎚��

> �𤩎 **頛𥪯� (FJU) ��蒈�仿��� 4 蝣潭彍摮堒�敶ａ�霅厩Ⅳ**嚗𡁶�撘讐鍂�砍𧑐�Ｙ� OCR �芸�颲刻����鈭��銝餌�撘譍�����𧶏�**�枏����exe嚗厰�甈∠鍂�� FJU ����芸�銝贝� OCR �����辣**嚗�儘霅睃��𠬍�璅∪�嚗諹��讛汗�函蒈�亦鍂����閙�����䔶��衤�頛㗇�嚗�蘨銝贝�銝�甈∴�嚗𥕦�憪讠Ⅳ摰㕑�隢见�鋆� `pip install -e .[ocr]`���頛劐��唳��芸����𠺶�峕��閧�讛汗�函蒈�乓�滢�甈∪�瘝輻鍂 cookie嚗��擗㗛��滚��賢��函㮾�䎚��

> �� **雿删�摮豢嵗銝滚銁銝𢠃𢒰皜�鱓鋆∴�銋蠘��兩�婙�娍�蝬脣�鞎潮�脰身摰𡁜停銵䎚��** �芾�雿删�摮豢嵗�峕見�� TronClass 蝟餌絞嚗�雯���瑕��� `https://tronclass.雿删�摮豢嵗.edu.tw` �� `https://ilearn.�圳��https://iclass.�圳嚗㚁��𢠃��讠雯��憛恍�脰身摰𡄯�蝔见�撠望�撟思��衤��讠�讛汗�刻�蝒𨰜���雿惩�撟喳虜銝�璅���閧蒈�伐��餃��𣂼�敺��撠望𦻖�贝䌊�閧𤀻暺𧼮���**銝滚��𠰴�蝣澆神�脰身摰𡁏�**嚗䔶�銝滚���神蝔见���底閬衤��Ｕ��身摰𡁏��坔飛�厩��峕���飛�∩��冽��株ㄐ嚗麄�滢�蝭���

> 鋆𨅯�銝��见虜閬讠�隤斗�嚗関ronClass �臭�憟𡑒◤敺��摮豢嵗�∠鍂��嵗�垍頂蝯梧�雿�**��嵗銝𦠜沲�����䌊撌勗���**�婙�𥪜銁�望絲摰�㙈�𢁾Learn�溻��銁瘛⊥��怒�𢁾Class�溻��𨭬�喳之摮詨� TronClass �祆��脣�蝬脣��湔𦻖�怒�𣊁ronClass�溻���摮𦯀�銝�璅��撉典�鋆∪㭱�臬�銝�憟� API嚗𥟇�隞亙�銝�憟㛖蒈�伐�暺𧼮�瘚��嚗�蘨閬���厩雯�蠘��餃��孵�嚗�停�賢��唬���飛�～��
>>>>>>> upstream/QR

---

## 摰㕑��孵�

�典�����券𤓖�虫�摰㕑� **Node.js (v18 �碶誑銝�)**��

�㯄�蝯�垢璈���瑁�隞乩���誘撠�極�瑕��笔�鋆嘅�

```bash
npm install -g auto-rollcall-tronclass
```

---

## 敹恍�笔���

�其遙�讛��坔冗銝剖遣蝡衤��� `config.yaml` 瑼娍�嚗𣬚鍂靘�身摰𡁏���飛�∟�撣唾�嚗�

```yaml
provider:
  base_url: "https://ilearn.thu.edu.tw" # �踵��鞉�摮豢嵗�� TronClass 蝬脣�

accounts:
  current: "default"
  profiles:
    default:
      user: "�函�摮貉�"
      passwd: "�函�撖�Ⅳ"

monitor:
  interval: 15 # 頛芾岷�㯄� (蝘�)
```

撱箇�憟賣�獢��嚗�銁�䔶��贝��坔冗摨蓥��瑁�嚗�

```bash
trothu run
```

蝔见�撠望��芸��餃�嚗䔶蒂�见��刻��舐�蝒株艘��𧙗�折��溻��

---

## �讠䔄���雿𦦵� NPM 璅∠�撘訫�

甇斤��� (v3.0.0+) 撌脰◤閮剛��箏虾隞亥�擛���箏�撅支�鞈氬����臭誑�蹱見撠���游��脰䌊撌梁� Node.js 撠��嚗�

```javascript
const { CampusNetworkAgent } = require('auto-rollcall-tronclass/src/lms-agent/agent');
const { AttendanceWatcher } = require('auto-rollcall-tronclass/src/attendance-tasks/watcher');

// �喳��刻䌊閮�� Logger (靘见� winston �� irika-Logger-System)
const myLogger = require('irika-Logger-System');

const config = {
  base_url: 'https://ilearn.thu.edu.tw'
};

const agent = new CampusNetworkAgent(config, { logger: myLogger });
const watcher = new AttendanceWatcher(agent, { logger: myLogger, interval: 15 });

async function start() {
  await agent.authenticate('user', 'pass');
  await watcher.start();
}

start();
```

---

## �𨀣䲰�羓� Python (AGPLv3)

��𧋦�� Python �羓�蝔见�蝣潘���鉄 CLI Bot���蝔桅�𡁶䰻�拚��刻� PyQt 隞钅𢒰嚗劐��嗡��坔銁撠���寧𤌍��葉嚗䔶�閰脤�������蝬剜� **AGPL-3.0**��

憒���券�閬�䰻�� Python ��𧋦��牧�擧�摰㕑��孵�嚗諹���鰐嚗�
 **[README-Python.md](./README-Python.md)**

---

## �渲����皞� (Credits)

�𣇉�甇� Node.js ��𧋦摰���齿鰵蝺典神鈭�沲瑽卝���頛航�瞍𠉛�瘜𤏪�隞交��� AGPL �單��找蒂�∠鍂 Apache 2.0 ���嚗䔶��砍�獢���萘��詨� API ���撌亦�����������芣䲰�煺�����𧢲�鞎Ｙ㭱��

<<<<<<< HEAD
�孵ê̌�蠘��笔�獢�����
- **Original author**: [@silvercow002](https://github.com/silvercow002)
- **Original project**: [silvercow002/tronclass-script](https://github.com/silvercow002/tronclass-script) (MIT License)
- **銵滨�撠��**: [hot-YUser/auto-rollcall-thu-tronclass](https://github.com/hot-YUser/auto-rollcall-thu-tronclass) (AGPL-3.0 License)
=======
---

## �毺�嚗𡁜��啣��舀�𡡞獐�芸�蝪賢����

�蹱挾�函蒾閰梯��𣬚�隞�暻澆�敺堒��溻��𧋦鞈芯�嚗𣊁ronClass �坔�蝟餌絞�𠹺�鈭�**�砌�銝滩府霈枏飛��嚉�啁��梯正嚗屸�誯�摮貊��芸楛撠梯��澆㙈�� API 瞍𤩺�鈭�**嚗屸�坔�见極�瑕停�舀��嗘�瞍𤩺��芸��𤥁��歇��

### �菜葫�圈��滚�嚗𣬚�隞�暻澆�蝑劐�銝见�蝪�

�鞱身���銝页�蝔见��菜葫�圈��滚�**銝齿�蝡见���枂**嚗諹�峕糓����仿�坔�隤脩�蝪賢����蝑匧�����剖�隤脩��� 15%�㵪�撌脩��� 15% ���摮貊偷�堆��滚枂�卝���蹱糓銝��枏��讛身閮��摰寥𥲤靽嗪麬嚗朞𨯬銝���葦�芣糓�𧢲�隤日����鈭��擐砌��𨀣�嚗屸�嗵車�寞𧋦瘝雴犖蝪賜����暺𧼮��滚停銝齿��𠹺�蝪賡�脣縧嚗𤤿��啁号銝𢠃�憪𧢲�鈭粹烵蝥𣬚偷�啜��Ⅱ隤齿糓�毺��券��滢�嚗𣬚�撘𤩺��蓥���彍摮� / �琿� / QR 銝厩車�賡��剁�QR ��銁蝑匧��罸���鍂�坔葦撣唾��𢠃��漤��坔末嚗屸�瑼颱��𡒊��駁��枂嚗剹��

憒��雿牐��唾��䠷�靽嗪麬����𥕢��菜葫�啣停蝡见�蝪賢�嚗�� `config.advanced.toml` �� `monitor.ignore_attendance_rate_gate` 閮剜� `true` �喳虾嚗���� / �垍��湔艶銋笔虾隞亦鍂 `python -m troTHU.tron run --ignore-attendance-rate-gate` �冽��𣈯��嗘�頛迎���

### �詨�暺𧼮�嚗𡁻��滨Ⅳ�嗅祕�誩銁 API �墧�鋆�

��葦�劐��詨�暺𧼮�敺䕘���銁�Ｗ��訫蔣銝�蝯��雿齿彍摮𡑒�憭批振頛詨����憿峕糓嚗�**摮貊�蝡舀�銝��� API嚗Ǒstudent_rollcalls`嚗㗇��湔𦻖�𢠃�嗵�甇�Ⅱ����滨Ⅳ�䂿策雿�**���隞仿�坔�见極�瑕�皜砍��詨�暺𧼮�敺䕘��湔𦻖�餉����蝣潦����潮��枂撠勗��鐥�婙�娍迤撣豢�瘜��銝�甈⊿��滚蘨閬�扔撠𤑳�隢𧢲���

�砌��芸予��𣈲 API 銝滨策蝣潔�嚗屸��匧��蹱䲮獢���𥕢��詨�銋�� 0000��9999 銝��祉車嚗𣬚凒�交𠂔�𥡝岫蝣潘��厰�瘚���颯������隡箸��冽����嚗峕�隞�**銝齿����硔����嗆��𣂼�**��

### �琿�暺𧼮�嚗𡁻����卝�𣬚征蝑娍��滚停�𦒘�

�琿�暺𧼮����銝𡃏�撽𡑒�雿删� GPS 摨扳��冽�摰斤��滚����撖行葫�潛𣶹銝��𧢲�蝣箇�隡箸��冽�瘣痹�**撠漤��漤��枂銝��见��函征���獢� `{}`嚗��撣嗡遙雿訫漣璅辷�嚗䔶撩�滚膥撠梁凒�交�雿惩ế摰𡁶�����氬�溻��** �蹱�撖行葫 100% �𣂼�嚗峕�隞交糓�鞱身����臭蜓�𥕦�瘜𨰝�婙�娪��枂敺���墧䰻銝�甈∠Ⅱ隤滨���偷�唳����蝞埈彍��

### �琿��蹱螱嚗朞䌊撌勗神������雿齿�蝞埈�

�砌��芸予�𣬚征蝑娍��漤�坔�𧢲㭘敺𤏸◤隡箸��刻��㚁��琿�暺𧼮�銋煺���停甇文仃���婙�𥪜��ａ��亥�銝�憟埈��芸楛�餌�摰帋��蹱螱嚗屸�嗘��舫�坔�见�獢�ㄐ�望�憭𡁜��萘�銝�憛𠺪�

摰�⏚�其��𧢲�頞���寞�改�**�嗡���枂��漣璅嗵��舀�嚗䔶撩�滚膥��末敹�𧑐�𧼮��䔶��Ｙ𤌍璅䠷��匧��𨬭�溻��** 蝔见��𢠃�坔�卝�諹��Ｕ�滨訜�鞱�皜祇�嚗峕�銝滚��嫣�����諹��Ｘ��箏���䔝皜祇�嚗峕𤣰���銝�蝯���銁�坔�钅�頝嗪𣪧�坔恕蝝� N �砍偕�滨�鞈��敺䕘�撠梯��� WGS84 �啁�璈Ｙ�摨扳�蝟颱��冽�撠誩像�寞���**憭𡁻�摰帋�嚗éultilateration嚗���𦠜葫頝嘥�雿㵪�**嚗���典枂�坔恕��移蝣箇�蝺臬漲嚗���𢠃��见漣璅䠷��枂�餌偷�啜���閫�鍂��糓�烾𣪧蝢文�潛�蝛拙���撠誩像�寞𨰹�� pattern-search 餈凋誨�嗆�嚗𤤿�����嗆�銝滚枂靘���漤���唳�敺䔶��𥕞�婙�𥪯誑隡啗�暺䂿�銝剖�����������𣂼�憭𡝗楲����斗聢�鞉聢���嚗𣬚凒�啣𦶢銝剜�暺𧼮�蝯鞉���

�孵ê̌隤芣�嚗𡁻�蹱㟲憟堒�雿齿糓**蝝娍�撌交��𨬭��妟憭㚚��詨飛憟𦯀辣**嚗��靘肽陷 numpy / scipy嚗㚁���隞亥��湔𦻖�枏��脣鱓銝��� exe 鋆∟����撟喳虜撟曆�頛芯��啣枂�湛�蝛箇�獢�停閫�捱鈭��嚗䔶�摰�糓鞎函��孵祕����函��衤����雿滚��𠬍�銝齿糓�箄�憟賜�����

### QR 暺𧼮�嚗𡁏��訫�摰寞��坔葦撣唾�頛𥪜𨭌

QR 暺𧼮���飛�毺垢 API �芣𦻖�� `data` + `deviceId`嚗䔶�**銝齿�**�� `data` �䂿策摮貊�嚗峕�隞乩�摰𡁜�敺𧼮ê̌��𧑐�寞嚉�圈�銝� `data`��

�芾身摰𡁏�撣怠董���嚗𣬚�撘譍��嗘�璇脲��閗楝敺𡢅��湔𦻖鞎潔� QR �批捆��鍂�祆�����具���敺𧼮�鞎潛倏�芸�撣嗅���枂嚗��敺𧼮���圾蝣� QR ���西� `qr-image` 憟𦯀辣嚗剹��

閮剖� `teacher` 敺�停�賢��芸�嚗𡁶�撘譍��菜葫�� QR 暺𧼮�嚗峕���鍂�坔葦撣唾�**�𣂼�憟�**銝��湔�撣怎垢 QR 暺𧼮�嚗��蝑匧�蝪賢����瑼餌��峕�撠勗��躰�嚗㚁�頛芸��臭誑��枂���霈��𡝗�撣怎垢 `qr_code` API ��葡**�����憚�𨥈�蝝�� 15 蝘𡜐�**�� `data`嚗𣬚��駁��枂摮貊�蝡� QR answer嚗䔶蒂�函Ⅱ隤滨�����滩��瑟鰵�������游��墧䰻 `student_rollcalls` 蝣箄��芸楛撌� `on_call_fine`嚗�偷�唳����嚗峕�敺峕��坔葦蝡舫��湧��漤��剹��㟲�钅�蝔衤���閬���閙���

---

## ��銵梶敦蝭�嚗�策�唾�鋆賢��嗡�摮豢嵗����潸���

TronClass �臭�撠穃飛�∪��函�摨訫惜�∪�蝟餌絞嚗���∟䌊銵�𦶢�滢��塚��望絲嚗𩥉Learn��楚瘙��iClass����厰𤩅嚗𨯔ronClass�佗�嚗䔶��Ｘ㟲��瓲敹� API ���瘜𤏪��嫣噶�嗡��峕見�� TronClass ��飛�∪翰�毺�閫���䌊銵�祕雿栶��膄鈭� THU / TKU嚗屸�坔� runtime 銋蠘�憟㛖鍂�� **TronClass �祆��脣�蝬�**隞亙��嗡��箸䲰 TronClass ��飛�∴��𥟇� base URL ��蒈�交�蝔见朖�荔���

> 蝡舫�隞� `{base}` 隞�”摮豢嵗�� TronClass 蝬脣�嚗�𨭬瘚� `https://ilearn.thu.edu.tw`��楚瘙� `https://iclass.tku.edu.tw`�佗�����㕑�瘙��撣嗥蒈�亙��� session cookie��

### �堒枂�桀������

```http
GET {base}/api/radar/rollcalls?api_version=1.1.0
```

�𧼮��桀��脰�銝剔�暺𧼮�皜�鱓����页�number / radar / qr嚗㚁�蝔见��𡁏迨����閧���

### �詨�暺𧼮�嚗��甈𡃏�蝣� + 敺���游�嚗�

```http
# 1) �湔𦻖霈��箸迤蝣粹��滨Ⅳ嚗���蛛��蹱𣈲摮貊�撠梯��澆㙈嚗�
GET {base}/api/rollcall/{rollcall_id}/student_rollcalls
    �� �墧��批鉄 number_code 甈��

# 2) ��枂蝪賢�
PUT {base}/api/rollcall/{rollcall_id}/answer_number_rollcall
    body: {"deviceId": "<�冽�>", "numberCode": "0837"}
```

霈�銝滚� `number_code` ���撠勗� `answer_number_rollcall` 隞� `0000`�𨦨9999` �寞活雿萇䔄閰衣Ⅳ嚗�鉄�鞉��瑕㭱���雿萇䔄嚗剹��

### �琿�暺𧼮�嚗�征蝑娍�瞍𤩺� + 頝嗪𣪧�齿綫�蹱螱嚗�

```http
# 銝餃�嚗𡁶征蝑娍��喲�嚗�撩�滚膥瞍𤩺�嚗�
PUT {base}/api/rollcall/{rollcall_id}/answer
    body: {}
# ��枂敺���� rollcall ���页�蝣箄��� on_call_fine嚗�歇蝪賢�嚗㗇��∩縑��

# �蹱螱嚗𡁜葆摨扳����獢��蝑娪𥲤����㗇�憭曉葆�諹��Ｙ𤌍璅坔��𨬭��
PUT {base}/api/rollcall/{rollcall_id}/answer?api_version=1.76
    body: { ...摨扳���evice��ser 蝑�... }
GET {base}/api/rollcall/{rollcall_id}/lite   # �硋� beacon / 閮𡃏�蝑厰�撣嗉�閮�
```

�蹱螱閫���𨳍�諹��Ｕ�滨訜閫�皜祇�嚗𣬚鍂蝛拙���撠誩像�寞��� WGS84 銝𠰴�憭𡁻�摰帋��齿綫�坔恕摨扳�嚗��銝滩���誑�⊿�璉讠𥿢�潮�鞉聢閬����𡺨�𠉛��仿��� **`empty_answer �� global_wgs84`**嚗�眏 `config.advanced.toml` �� `radar.strategy` �豢�嚗屸�閮� `empty_answer`嚗㚁��函�摰帋�瘙�圾�典銁 `troTHU/global_radar_solver.py`嚗峕糓�嗆彍摮詨�隞嗡�鞈渡�蝝� Python 撖虫���

### QR 暺𧼮�嚗��撣怨��拙�敺� data嚗�

```http
# �坔葦撣唾�撱箇� / �笔�銝��� QR 暺𧼮�
POST {teacher_base}/api/course/{course_id}/rollcall
POST {teacher_base}/api/rollcall/{teacher_rollcall_id}/start-rollcall

# �坔葦蝡航��硋��� QR data
GET {teacher_base}/api/course/{course_id}/rollcall/{teacher_rollcall_id}/qr_code
    �� �墧��批鉄 data

# 摮貊�撣唾���枂��𧋦隤脣��� QR 暺𧼮�
PUT {student_base}/api/rollcall/{student_rollcall_id}/answer_qr_rollcall
    body: {"data": "<teacher data>", "deviceId": "<�冽�>"}

# 銝滩��𣂼�憭望��賡��㗇�撣怎垢暺𧼮�
PUT {teacher_base}/api/rollcall/{teacher_rollcall_id}/stop_qr_rollcall
```

��枂敺峕��滩�摮貊�蝡� `student_rollcalls` / `answers` 蝣箄����卝���撣怠董�毺蒈�亙仃�埈��曆��啗玨蝔𧢲�嚗�蘨����� QR �坔葦頛𥪜𨭌嚗峕彍摮𡑒��琿�暺𧼮�隞滨�撣貊𧙗�扼��

### 蝔见�蝯鞉��蠘汗

- `troTHU/runtime_context.py`嚗帋葉憭格�蝝琜�����典��瑁����页�銝行���像��遆撘誩𦶢�滨征�𤘪権頛匧��啣�璅∠���鰵憓噼��賜鍂 `ctx.foo` �澆㙈��遆撘𤩺�嚗諹��券�躰ㄐ�� `_LEGACY_EXPORTS` 閮餃���
- `troTHU/monitor_runtime.py`嚗𡁻�閮剔���綉銝餉艘����餃� �� 靘脲�蝔� �� �菜葫暺𧼮� �� ���嚗剹��
- `troTHU/number_runtime.py`��troTHU/radar_runtime.py`嚗𡁜�蝔桅��滨�撖虫��詨�嚗���Ｙ� API 撠勗銁�躰ㄐ嚗㚁��琿�������雿齿�閫�膥�行𦆮�� `troTHU/global_radar_solver.py`嚗�� Python WGS84 憭𡁻�摰帋�嚗剹��
- `troTHU/qr_runtime.py`��troTHU/qr_teacher_runtime.py`嚗鑔R �见� / �芾票蝪輸��枂���撣怠董�蠘��拇�蝔卝��
- `troTHU/providers.py`嚗𡁏𣈲�渡�摮豢嵗�駁�銵剁�base URL��auth_flow`����𥟇�璅辷���窒�冽𠳿�厩蒈�交�蝔讠��啣飛�∴�敺鮋�躰ㄐ�牐�蝑�朖�荔��朞秐�舐��� `config.advanced.toml` �� `[provider.available.<�∪�>]` 摰𡁶儔嚗���其�敹�㺿蝔见���
- `troTHU/login_flow.py`嚗�**�臭���絞銝��餃�瘚��**嚗Ǒrun_login_flow`嚗剹����餃����甈∪�嚗𣬚�蝎嫣����皜砍�����Ｙ鸌敺萸�滚�瘚��婙�娍��⊿�霅厩Ⅳ��𪑛銝�蝔桅�霅厩Ⅳ嚗���见�瑼䈑�Keycloak JSON嚗剹��糓�衣�擐㚚� SSO �Ｙ揣��糓�衣��祆��� email SPA��糓�衣� NetIQ NAM�婙��**蝯蓥�隞亙飛�∠���𣈲�硋𦶢��**��鰵憓硺�蝔桀����芾���蒈�乓���摰𠾼�齿���閬�銁�躰ㄐ�牐��讠鸌敺菔���遆撘𧶏��𥟇鰵摮豢嵗�𡁜虜隞�暻潮�銝滚�蝣啜��
- `troTHU/login_probe.py`嚗䫤login-probe` ��誘�婙�𥪜��券�摮豢嵗���撖衣蒈�仿��𡁜�撣喳��Ｘ葫嚗�虾�娍�改�撖阡� adapter 閫��嚗㚁��臬�甇詨������䔶�蝺𡁜�撽𡑒��滨�撌亙���
- `troTHU/tron_http.py`嚗𡁶垢暺鮋��閧� HTTP client嚗Ǒrun_login_flow` �典�銋衤��瑁�嚗剹��
- `troTHU/auth_runtime.py`嚗朞�摮豢嵗�⊿���蒈�乩蜓瘚��嚗Ếookie �����鐤�怎絞銝�瘚����PI session 撽𡑒����讛汗�典��踺���蝔桃��贝��鞟內嚗剹��

### �啣�銝���摮豢嵗嚗�策�讠䔄���

���摮豢嵗蝟餌絞�滚��讛身閮���啣�摮豢嵗����祆扔雿𠬍��䔶�**�餃�瘚��摰��蝯曹�**嚗𡁏��匧飛�⊿�韏啣�銝�璇� `run_login_flow`嚗𣬚眏蝔见��典嘑銵峕��菜葫�餃���鸌敺菔䌊�訫�瘚��瘝埝�隞颱�銝���摮豢嵗鈭急��孵�蝔见�蝣潭��孵��賢����������璇嘥�撖阡����潸���銝滚��塚�**隞颱� TronClass 摮豢嵗嚗䔶蝙�刻��蘨閬�銁 `config.conf` �� `school` �� `now` 憛急�閰脫嵗蝬脣�嚗�停�質䌊�閧蒈��**嚗�敦蝭�閬衤��Ｕ�����飛�∩��冽��株ㄐ嚗麄�劐�蝭�嚗剹��𥅾�喋��‵隞��撠梯䌊�閧蒈�乓�㵪�靘苷��ａ�銝�璇肽楝嚗�

**�𥪜�銝�嚗𡁜�銝�蝑� provider嚗��撣貉�嚗屸�𡁜虜撠勗�鈭����** �删��餃�瘚����䌊�訫�皜祉鸌敺蛛��啣飛�∪���**�芾�銝��� `base_url`**嚗�

- *瘞訾��啣�嚗������ PR嚗�*嚗𡁜銁 `troTHU/providers.py` �� `PROVIDERS` �牐�蝑� `ProviderDefinition`嚗䔶蒂�� `PROVIDER_ALIASES` 鋆靝�銝剛㘚��ê̌�溻��
  ```python
  "scu": ProviderDefinition(
      key="scu",
      label="Soochow University TronClass",
      base_url="https://tronclass.scu.edu.tw",
      capabilities=ProviderCapabilities(number=True, radar=True, qrcode=True, ...),
  ),
  ```
- *蝝磰身摰𡁏��啣�嚗�𧋦璈�楲������其��閧�撘讐Ⅳ嚗�*嚗𡁜銁 `config.advanced.toml` �牐��见�憛𠺪��齿䲰 `config.conf` �� `school` 憛急��䔶��见�摮梹����� API 蝡舫���䌊�閙綫撠汿��
  ```toml
  [provider.available.my_school]
  base_url = "https://tronclass.my-school.edu.tw"
  ```
  ```conf
  school = my_school
  ```
  **`auth_flow` �胯�屸�憛急�蝷箝�㵪�銝齿糓���靘脲�**嚗𡁏�蝔𧢲��典嘑銵峕��芸��菜葫�餃���惇�潔��堒𪑛銝�蝔殷�甇�虜���**銝滚�閮剖�**����芯��嗘���辣隤芣����敺𣬚㮾摰對�隞亙��拙�贝�����⊿���ế�瘀�蝻� OCR 憟𦯀辣����滨���manual_cookie_only` / `interactive_browser` 璅∪�嚗剹����匧�潮�隞乓���摰𡄯��孵噩�滚𦶢�㵪�**瘝埝�摮豢嵗�滨迂**嚗�
  - `cas`嚗𡁏�皞� CAS嚗𣺋eycloak 撣喳��餃����憭𡁏彍摮豢嵗嚗𥟇𨭬瘚瑯��𨭬�喃漲�䕘����蝔衤�敺𧢲��函蒈�亙��齿�銝�甈� API 蝣箄� session�婙�𥪜��� TronClass 頛匧��餃������銁 LMS 蝬脣�蝔桐�憿�鈡�� `session` cookie嚗���� cookie �其��冽�隤文ế�𣂼���
  - `cas_ocr_captcha`嚗鋴AS �餃���𡖂�剹�屸��见�敶ａ�霅厩Ⅳ�㵪�頛𥪯���絲瘣页����閮剖�瑼� `captcha.jpg`����� `captcha`��4 蝣潘��冽𧋦�� OCR �芸�颲刻�嚗𥡝��潔��峕��澆�憛𠰴�閬�神 `captcha_image_name` / `captcha_field` / `captcha_charset` / `captcha_length`嚗�
    ```toml
    [provider.available.my_school]
    base_url = "https://tronclass.my-school.edu.tw"
    auth_flow = "cas_ocr_captcha"        # 憭𡁜��舐��伐��菜葫�圈�霅厩Ⅳ甈��撠望��芸��閧�
    captcha_charset = "0123456789abcdefghijklmnopqrstuvwxyz"  # �鞱身�� 0-9
    captcha_length = 5                                        # �鞱身 4
    ```
  - `keycloak_ocr_captcha`嚗鐗eycloak嚗Ǒtw-common` 雿�艶嚗厩� JSON 撽𡑒�蝣潑�婙�渄S �� `GET /auth/realms/<realm>/captcha/code` �� `{image, key}`嚗屸��枂��葆 `captchaCode`嚗㞗captchaKey`���蝔贝䌊�閗����鈭墧散��收�𨰻���撠橘���
  - `public_cloud_email`嚗関ronClass �毺� email嚗誩�蝣� SPA����匧��� CAS嚗���厰𤩅摰条雯��噫���⊥�嚗剹��
  - `nam_neai`嚗鐭etIQ Access Manager嚗𠃊EAI嚗农SO嚗�楚瘙����SO 銝餅��梁蒈�仿��� JS �芸��典�嚗�**銝滚神甇�**隞颱�摮豢嵗蝬脣���
  - 擐㚚�撣嗚�峕𧋦�∴�蝯曹��餃��崾kc_idp_hint` ��飛�∴�敶啣葦����胯��𤩅蝘㻫��𠹻�𨳍�������噫���𤾸�嚗㚁�瘚����䌊�閗�擐㚚� `orgSettings.loginSettings` �曉枂�∪� SSO �亙藁����� JS �芸��𣂷漱銝剛�銵典鱓嚗��靘肽府����贝䌊�閗����璅蹱�撣喳�銵典鱓�喃蝙甈���寞�憒� `muid/mpassword`��Ecom_User_ID/Ecom_Password` 銋���芸��菜葫嚗𥕦鉄撽𡑒�蝣潸䌊�� OCR嚗𥕦��� Google嚗誩凝頠蠘��血� IdP ��䌊�閖��讛汗�剁��婙�𥪜�璅�**銝滚�閮剖�**��
  - �交��� `/login` 銝齿�銋暹楊頧㕑歲�啁蒈�亥”�殷�撠烐彍�芸銁 `/cas/login` �𣂷�嚗㚁��澆�憛𠰴���� `login_url`��

**�𥪜�鈭䕘��齿��芾���蒈�亙�摰𡄯�璆萄��賂���** �芣��嗆��∠��餃����摰𠾼�齿糓�暹��孵噩�菜葫摰��瘨菔�銝滚�����啣��𧢲�嚗峕���閬��蝔见�嚗𡁜銁 `troTHU/login_flow.py` �� `resolve_credential_form` �牐�璇萘鸌敺萄�皜研��蒂撖思��见��厩���枂蝑𣇉裦嚗�**隞乓���摰𡄯��孵噩�滚𦶢�㵪�蝯蓥�隞亙飛�∪𦶢��**��蒈�亦��见ế霈���𥲤隤斗�蝷箝��ession 撽𡑒����讛汗�典��䠷�撌脩絞銝�嚗䔶�敹��蝣啜����见���� `python -m troTHU.tron login-probe --school <隞��>`嚗𣬚�瘚���函�撖虫撩�滚膥銝𠰴�皜砍�隞�暻潘�憭𡁜���䔄�暹覔�砌��典���

**�𥪜�銝㚁�蝝� Cookie �臬�嚗��撖思遙雿閧蒈�仿�頛荔���** �喟凒�亙��讛汗�刻� cookie��歲�𤾸�蝣潛蒈�伐��𡃏府�� `auth_flow` 閮剜� `manual_cookie_only`嚗���券�脤�閮剖��� `webview`嚗���冽�隞文𥲤�乓��頂蝯望��典𥲤�亦訜銝贝�瘥𤩺活�瑁���䌊�訫�閰脫嵗 API 撽𡑒� session嚗𣬚Ⅱ靽� cookie �㗇�����閖�暺㗛��麄��

```toml
[provider.available.scu]
base_url = "https://tronclass.scu.edu.tw"
auth_flow = "manual_cookie_only"
```
```bash
python -m troTHU.tron webview import --input <cookie-json-path> --save
```

### 摰㕑��貊鍂�蠘�嚗��憪讠Ⅳ嚗�

```bash
python -m pip install -e .[packaging]   # PyInstaller �枏�
python -m pip install -e .[browser]     # Playwright嚗�蒈�仿��寧����敺���餃�嚗�
python -m pip install -e .[keyring]     # �函頂蝯梢��啣�摮睃董撖�
```

---

## �讠䔄��葫閰�

皜祈岫�券��Ｙ��瑁�嚗�鍂��� TronClass 隡箸��冽芋�穿�嚗䔶���１�唬遙雿閧�撖血飛�∴�

```bash
python -m py_compile troTHU/tron.py troTHU/runtime_context.py troTHU/cli_main.py
python -m unittest discover -v
python -m troTHU.tron release-build --dry-run --json
```

---

## �桀��𣂼�

- **QR �坔葦頛𥪜𨭌��閬�虾�餃�銝𥪜虾�潸絲暺𧼮����撣怠董��**嚗𥟇𧊋閮剖��𣇉蒈�亙仃�埈�嚗�蘨靽萘��见�鞎潔� / �芾票蝪輯��押��
- **Telegram �芸��桀��𡁶䰻**嚗䔶��交𤣰��誘��
- **�𧼮�撱箏飛�∴�鞎潛雯��嚗㕑粥�见��讛汗�函蒈��**嚗朞�雿㰘扛�芸銁頝喳枂���讛汗�刻ㄐ�餃�銝�甈∴�銋见��� cookie 敹怠��𡁜虜銝滚�瘥𤩺活�滨蒈嚗㚁�銝滚��批遣摮豢嵗��見��蒈�仿��刻䌊�𨰻��𤀻暺𧼮���䌊�閧偷�啁��典�����函㮾�䎚��
- �鞱身�� Windows zip �批遣 Playwright �餃�頛𥪜𨭌憟𦯀辣嚗��讛汗�其��脖�瑼娍䲰擐𡝗活雿輻鍂������芸�銝贝�嚗𣬚� 150MB嚗㚁�keyring��R 敶勗�閫�Ⅳ蝑匧�隞㚚��典��賢�銝滚�撱綽���閬��閰梯��典�憪讠Ⅳ摰㕑�撠齿� extras��

---

## �����蝙�刻���蝭� (AGPL-3.0)

�砍�獢�誑 **GNU Affero General Public License v3.0 �𡝗凒�啁���** (`AGPL-3.0-or-later`) �����底閬� [LICENSE](LICENSE)嚗��憪见抅蝷擧沲瑽衤�皞鞱��� MIT ����脫�撌脖蔥�交𧋦��辣�怠偏���諹稲雓肽�靘�� (Credits)�滢�蝭���

### �働 蝪∪鱓蝘烐芦嚗𡁜� MIT 頧厩� AGPLv3 隞�”隞�暻潘�

�笔�獢�繧�函� **MIT ���**�𧼮虜撖祇�嚗�抅�砌��胯�屸辶雿䭾�𡡞獐�嫘���𡡞獐鞈��銵䎚�溻���峕𧋦撠��撱嗡撓靽格㺿敺䕘�甇��頧厩� **AGPLv3 ���**嚗屸�蹱糓銝���**��撥����扼�滨��𧢲��磰降**嚗�

1. **�芸楛�剁��祆��瑁�嚗�**嚗𡁜��靝��芣糓銝贝��砍�獢���芸楛�券𤓖�虫��瑁�暺𧼮���綉嚗�**銝滚�隞颱��𣂼�**嚗䔶�銝漤�閬���衤遙雿閙𨭬镼踴��
2. **靽格㺿敺䎚����潦�齿��峕�靘𤤿雯頝舀��踺��**嚗𡁜��靝�靽格㺿鈭�𧋦撠�����撘讐Ⅳ嚗䔶蒂撠��嚗�
   - **�喟策�乩犖雿輻鍂**嚗���潔耨�寧��瑁�瑼娍��笔�蝣潘�
   - **�嗉身�函雯頝臭�蝯血ê̌鈭箇鍂**嚗��憒���嗉身�𣂼���/蝘�犖�� Telegram 暺𧼮�璈笔膥鈭箸��踺��eb 蝬脤�蝡舀��嗵�嚗�
   - �𩤃� **雿惩����璇苷辣撠��靽格㺿敺𣬚�摰峕㟲�笔�蝣潘�隞� AGPLv3 �磰降�𧢲��祇�**嚗䔶蒂�𣂷�蝞⊿�霈㮖蝙�刻���頛剹��
3. **蝳�迫蝘���𤥁��孵��脤���**嚗帋�**銝滩�**撠�𧋦撠���寞㺿�滨迂��黸�誩�憪讠Ⅳ敺䕘�����鞱䌊撌梁��嗉祥頠罸��㚚�皞𣂼極�瑟�靘𤤿策隞碶犖��

### �� 隢见之摰嗆�頨怨䌊�䜘���摰��蝭�

�𧢲�蝷曄黎��䔄撅訫遣蝡见銁敶潭迨靽∩遙����滢�銝𨳍����踹�甇文極�瑞鍂�潔遙雿訫�璆剔��押���鋆肽痔�桐�銵𣬚���𥅾�㕑䌊銵䔶耨�嫘��沲閮剜��其犖�滚��碶�甈∪��潛���瘙��隢见�敹�䌊閬粹�摰� AGPLv3 璇脲狡嚗�**銝餃�����其耨�孵��� GitHub 撠��������憪讠Ⅳ**��之摰嗆�頨怨䌊�𨥈�撠���滩�韏啣��湧���

---

# �渲����皞� (Credits)

## Original Project

This project is a fork of [silvercow002/tronclass-script](https://github.com/silvercow002/tronclass-script).

- Original author: [@silvercow002](https://github.com/silvercow002)
- Original project: [silvercow002/tronclass-script](https://github.com/silvercow002/tronclass-script)
- MIT License commit: [9a149d1c8470344ad3757893255bf11719782f3e](https://github.com/silvercow002/tronclass-script/commit/9a149d1c8470344ad3757893255bf11719782f3e)
- Original MIT notice: `Copyright (c) 2025 silvercow02`

Auto-Rollcall-thu-Tronclass keeps this original MIT notice and currently publishes the modified project under GNU Affero General Public License v3.0 or later (`AGPL-3.0-or-later`). The original MIT License notice is preserved at the bottom of the [LICENSE](LICENSE) file.

感謝他們為 TronClass 自動化開創了先河！  
不過版專案的Python版本內容僅做為參考文件使用，請勿直接使用或修改其中的程式碼，因為它已經不再維護且可能存在安全風險。
