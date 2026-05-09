import { Tabs } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../../../context/AuthContext";
import { TouchableOpacity, View, Image, Alert } from "react-native";

export default function PromoterTabLayout() {
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
                name="upload"
                options={{
                    title: "Upload Sale",
                    tabBarIcon: ({ color }) => <MaterialIcons name="add-circle" size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="sales"
                options={{
                    title: "My Sales",
                    tabBarIcon: ({ color }) => <MaterialIcons name="list" size={24} color={color} />,
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
                name="details/[id]"
                options={{
                    href: null,
                }}
            />
        </Tabs>
    );
}
