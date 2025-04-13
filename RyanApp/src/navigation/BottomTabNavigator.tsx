import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, View, Pressable } from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import InsightsScreen from '../screens/InsightsScreen';
import CalendarScreen from '../screens/CalendarScreen';
import OptionsScreen from '../screens/OptionsScreen';
import DeepWorkScreen from '../screens/DeepWorkScreen';
import { colors } from '../theme/colors';

type RootTabParamList = {
  Home: undefined;
  Insights: undefined;
  DeepWork: undefined;
  Calendar: undefined;
  Options: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const CustomFlowerButton = ({ onPress }: { onPress: () => void }) => {
  const animationRef = React.useRef<LottieView>(null);
  const [isAnimationReady, setIsAnimationReady] = React.useState(false);

  React.useEffect(() => {
    if (animationRef.current && isAnimationReady) {
      animationRef.current.reset();
      animationRef.current.play();
    }
  }, [isAnimationReady]);

  return (
    <View style={{
      position: 'absolute',
      alignItems: 'center',
      width: '100%',
      bottom: Platform.OS === 'ios' ? 15 : 5,
    }}>
      <Pressable 
        onPress={() => {
          onPress();
          if (animationRef.current) {
            animationRef.current.reset();
            animationRef.current.play();
          }
        }}
        style={({ pressed }) => ({
          height: 60,
          width: 60,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          opacity: pressed ? 0.7 : 1,
          transform: [{ scale: pressed ? 0.95 : 1 }],
        })}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <View style={{ 
          width: 60, 
          height: 60, 
          alignItems: 'center', 
          justifyContent: 'center',
          overflow: 'hidden'
        }}>
          <LottieView
            key="flower-animation"
            ref={animationRef}
            source={require('../assets/flower-animation.json')}
            style={{
              width: 120,
              height: 120,
              position: 'absolute',
            }}
            autoPlay
            loop
            speed={0.5}
            onLayout={() => setIsAnimationReady(true)}
          />
        </View>
      </Pressable>
    </View>
  );
};

const BottomTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background.dark,
          borderTopColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          height: Platform.OS === 'ios' ? 80 : 60,
          paddingBottom: Platform.OS === 'ios' ? 25 : 8,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        },
        tabBarActiveTintColor: colors.primary.main,
        tabBarInactiveTintColor: colors.text.secondary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginBottom: Platform.OS === 'ios' ? 0 : -5,
          marginTop: Platform.OS === 'ios' ? 0 : -2,
        },
        tabBarItemStyle: {
          paddingHorizontal: 4,
        },
        tabBarIconStyle: {
          marginTop: Platform.OS === 'ios' ? 0 : 4,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Insights"
        component={InsightsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="analytics" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="DeepWork"
        component={DeepWorkScreen}
        options={({ navigation }) => ({
          tabBarButton: (props) => (
            <CustomFlowerButton 
              onPress={() => {
                navigation.navigate('DeepWork');
              }} 
            />
          ),
          tabBarLabel: () => null,
        })}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Options"
        component={OptionsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default BottomTabNavigator; 