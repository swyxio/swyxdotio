// need access to localstorage but cant call onmount with ssr
// so write our own custom store!

// todo: detect browser preference darkmode
const defaultTheme = {
  name: 'default',
  bgColor: '#1d1f21',
  textColor: '#eeeeee',
  linkColor: '#2cb67d',
  lineLength: '69ch'
}
let _themeStore = defaultTheme
let subscribers = new Set()
let broadcast = () => subscribers.forEach(cb => cb(_themeStore))
let saveToStorage = () => {
  if (_themeStore && typeof document !== 'undefined')
    localStorage.setItem('swyx_io_themeStore', JSON.stringify(_themeStore))
}
export const themeStore = {
  subscribe(cb) {
    if (subscribers.size < 1 && typeof document !== 'undefined') {
      let temp = localStorage.getItem('swyx_io_themeStore')
      _themeStore = temp ? JSON.parse(temp) : defaultTheme
    }
    cb(_themeStore)
    subscribers.add(cb)
    return () => void subscribers.delete(cb)
  },
  set(newVal) {
    _themeStore = newVal
    broadcast()
    saveToStorage()
  },
  update(updateFn) {
    _themeStore = updateFn(_themeStore)
    broadcast()
    saveToStorage()
  }
}
