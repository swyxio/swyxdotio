// need access to localstorage but cant call onmount with ssr
// so write our own custom store!

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
  // if (_themeStore && typeof window !== undefined)
  //   window.localStorage.setItem('themeStore', JSON.stringify(_themeStore))
}
export const themeStore = {
  subscribe(cb) {
    // if (subscribers.size < 1 && typeof window !== undefined) {
    //   let temp = window.localStorage.getItem('themeStore')
    //   _themeStore = temp ? JSON.parse(temp) : defaultTheme
    // }
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
