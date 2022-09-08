/*
* 面板圣遗物
* */
import lodash from 'lodash'
import Base from './Base.js'
import { Artifact, Character } from './index.js'
import { Format } from '../components/index.js'
import ArtisMark from './profile-lib/ArtisMark.js'
import { attrMap, attrNameMap, attrValue } from '../resources/meta/reliquaries/artis-mark.js'

export default class ProfileArtis extends Base {
  constructor (charid = 0, ds = false) {
    super()
    this.charid = charid
    this.artis = {}
    if (ds) {
      this.setArtisSet(ds)
    }
    return this._proxy()
  }

  setProfile (profile, artis) {
    this.profile = profile
    this.setArtisSet(artis)
  }

  setArtisSet (ds) {
    for (let key in ds) {
      this.setArtis(key, ds[key] || {})
    }
  }

  setArtis (idx = 1, ds = {}) {
    idx = idx.toString().replace('arti', '')
    let ret = {}
    ret.name = ds.name || Artifact.getArtiBySet(ds.set, idx) || ''
    ret.set = ds.set || Artifact.getSetByArti(ret.title) || ''
    ret.level = ds.level || 1
    ret.main = ArtisMark.formatAttr(ds.main || {})
    ret.attrs = []
    for (let attrIdx in ds.attrs || []) {
      if (ds.attrs[attrIdx]) {
        ret.attrs.push(ArtisMark.formatAttr(ds.attrs[attrIdx]))
      }
    }
    this.artis[idx] = ret
  }

  forEach (fn) {
    lodash.forEach(this.artis, (ds, idx) => {
      if (ds.name) {
        fn(ds, idx)
      }
    })
  }

  _get (key) {
    let artis = this.artis
    switch (key) {
      case 'length':
        return artis.length
    }
    if (artis[key]) {
      return artis[key]
    }
  }

  toJSON () {
    return this.getData('1,2,3,4,5')
  }

  get sets () {
    return this.getSetData().sets
  }

  get names () {
    return this.getSetData().names
  }

  mainAttr (idx) {
    let main = this.artis[idx]?.main
    if (!main) {
      return ''
    }
    let title = main.title
    if (/元素伤害/.test(title)) {
      return 'dmg'
    }
    if (attrNameMap[main.title]) {
      return attrNameMap[main.title]
    } else {
      console.log(main.title)
    }
    return ''
  }

  getSetData () {
    let setCount = {}
    this.forEach((arti, idx) => {
      setCount[arti.set] = (setCount[arti.set] || 0) + 1
    })
    let sets = {}
    let names = []
    for (let set in setCount) {
      if (setCount[set] >= 2) {
        sets[set] = setCount[set] >= 4 ? 4 : 2
        names.push(Artifact.getArtiBySet(set))
      }
    }
    return { sets, names }
  }

  getCharCfg () {
    let char = Character.get(this.charid)
    let { attrWeight, title } = char.getArtisMarkCfg(this.profile, this)
    let attrMark = {}

    let baseAttr = char.baseAttr || { hp: 14000, atk: 230, def: 700 }
    lodash.forEach(attrWeight, (weight, attr) => {
      attrMark[attr] = weight / attrValue[attr]
    })

    // let baseAttr = [400, 500, 300];
    if (attrMark.hp) {
      attrMark.hpPlus = attrMark.hp / baseAttr.hp * 100
    }
    if (attrMark.atk) {
      // 以520作为武器白值均值计算
      attrMark.atkPlus = attrMark.atk / (baseAttr.atk * 1 + 520) * 100
    }
    if (attrMark.def) {
      attrMark.defPlus = attrMark.def / baseAttr.def * 100
    }
    let maxMark = ArtisMark.getMaxMark(attrWeight)
    let titleMark = {}
    let titleWeight = {}
    lodash.forEach(attrMark, (mark, attr) => {
      let aTitle = attrMap[attr].title
      if (/小/.test(aTitle)) {
        return
      }
      titleMark[aTitle] = mark
      titleWeight[aTitle] = attrWeight[attr] || 0
      if (/大/.test(aTitle)) {
        let sTitle = aTitle.replace('大', '小')
        titleWeight[sTitle] = titleWeight[aTitle]
      }
    })
    return {
      classTitle: title,
      weight: attrWeight,
      mark: attrMark,
      titleMap: titleMark,
      titleWeight,
      maxMark
    }
  }

  getMarkDetail (withDetail = true) {
    let charCfg = this.getCharCfg()
    let artis = {}
    let setCount = {}
    let usefulMark = charCfg.titleWeight
    let totalMark = 0
    this.forEach((arti, idx) => {
      let mark = ArtisMark.getMark(charCfg, idx, arti.main, arti.attrs)
      totalMark += mark
      setCount[arti.set] = (setCount[arti.set] || 0) + 1
      if (!withDetail) {
        artis[idx] = {
          _mark: mark,
          mark: Format.comma(mark, 1),
          markClass: ArtisMark.getMarkClass(mark)
        }
      } else {
        artis[idx] = {
          name: arti.name,
          set: arti.set,
          level: arti.level,
          _mark: mark,
          mark: Format.comma(mark, 1),
          markClass: ArtisMark.getMarkClass(mark),
          main: ArtisMark.formatArti(arti.main, charCfg.mark, true),
          attrs: ArtisMark.formatArti(arti.attrs, charCfg.mark)
        }
      }
    })
    let sets = {}
    let names = []
    for (let set in setCount) {
      if (setCount[set] >= 2) {
        sets[set] = setCount[set] >= 4 ? 4 : 2
        names.push(Artifact.getArtiBySet(set))
      }
    }
    this.mark = totalMark
    this.markClass = ArtisMark.getMarkClass(totalMark / 5)
    let ret = {
      mark: Format.comma(totalMark, 1),
      _mark: totalMark,
      markClass: ArtisMark.getMarkClass(totalMark / 5),
      artis,
      sets,
      names,
      classTitle: charCfg.classTitle
    }
    if (withDetail) {
      ret.usefulMark = usefulMark
    }
    return ret
  }
}
