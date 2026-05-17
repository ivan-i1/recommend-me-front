import { AppRegistry } from 'react-native';
import App from './App'; // Points to your App.tsx

// Register the app
AppRegistry.registerComponent('App', () => App);

// Mount the app to the HTML div we created
AppRegistry.runApplication('App', {
  initialProps: {},
  rootTag: document.getElementById('root'),
});
