const { hookInterface } = require('@elderjs/elderjs');
module.exports = ({ request, data }) => {
  data.hookInterface = hookInterface;
  return data;
};
