const React = require('react');
const { Text } = require('react-native');
const Ionicons = ({ name, size, color }) =>
  React.createElement(Text, { testID: `icon-${name}` }, name);
module.exports = { Ionicons };
