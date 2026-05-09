import { Tabs } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../../../context/AuthContext";
import { TouchableOpacity, View, Image, Alert } from "react-native";

export default function ApproverTabLayout() {
  const { logout } = useAuth();

  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        tabBarHideOnKeyboard: true,
        headerShown: false,
        tabBarActiveTintColor: "#1976d2",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => <MaterialIcons name="dashboard" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="sales"
        options={{
          title: "Review Sales",
          tabBarIcon: ({ color }) => <MaterialIcons name="fact-check" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="announcements"
        options={{
          title: "Announcements",
          tabBarIcon: ({ color }) => <MaterialIcons name="announcement" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="my-promoters"
        options={{
          title: "My Promoters",
          tabBarIcon: ({ color }) => <MaterialIcons name="people" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="add-promoter"
        options={{
          title: "Add Promoter",
          tabBarIcon: ({ color }) => <MaterialIcons name="person-add-alt-1" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="details/[id]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="sale/[id]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="sale/duplicates"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="promoter/[id]"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
