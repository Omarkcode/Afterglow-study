/* Runs synchronously in <head> to avoid flash-of-wrong-theme */
(function () {
  if (localStorage.getItem('luminesce_day_mode') === 'on') {
    document.documentElement.setAttribute('data-theme', 'day');
  }
})();
