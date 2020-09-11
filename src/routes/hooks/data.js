const { hookInterface } = require('@elderjs/elderjs');
module.exports = ({ request }) => {
  const { slug } = request;
  const data = hookInterface.find((hookDetails) => hookDetails.hook === slug);
  return data;
};
