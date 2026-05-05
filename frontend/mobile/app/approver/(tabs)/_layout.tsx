import { Tabs } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../../../context/AuthContext";
import { TouchableOpacity, View, Image, Alert } from "react-native";

export default function ApproverTabLayout() {
  const { logout } = useAuth();

  return (
    <Tabs
      screenOptions={{
        tabBarHideOnKeyboard: true,
        headerLeft: () => (
          <View style={{ marginLeft: 30, marginTop: 20, justifyContent: "center", height: "100%", width: 100 }}>
            <Image
              source={require("../../../assets/images/logo.png")}
              style={{ width: "100%", height: "100%", resizeMode: "contain", transform: [{ scale: 2.1 }] }}
            />
          </View>
        ),
        headerTitle: "",
        headerRight: () => (
          <TouchableOpacity
            onPress={() =>
              Alert.alert("Logout", "Are you sure you want to logout?", [
                { text: "Cancel", style: "cancel" },
                { text: "Logout", onPress: logout, style: "destructive" },
              ])
            }
            style={{ marginRight: 15 }}
          >
            <MaterialIcons name="logout" size={24} color="#f00" />
          </TouchableOpacity>
        ),
        tabBarActiveTintColor: "#1976d2",
        headerShown: true,
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
    </Tabs>
  );
}

