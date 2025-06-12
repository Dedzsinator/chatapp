import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function App() {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>🚀 RealChat</Text>
            <Text style={styles.subtext}>Metro Runtime Fixed!</Text>

            <TouchableOpacity style={styles.button}>
                <Text style={styles.buttonText}>App Working ✅</Text>
            </TouchableOpacity>

            <View style={styles.infoContainer}>
                <Text style={styles.infoText}>Frontend: localhost:8081</Text>
                <Text style={styles.infoText}>Backend: localhost:4000</Text>
            </View>

            <StatusBar style="light" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#007AFF',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    text: {
        fontSize: 32,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtext: {
        fontSize: 16,
        color: 'white',
        opacity: 0.8,
        textAlign: 'center',
        marginBottom: 32,
    },
    button: {
        backgroundColor: 'white',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 8,
        marginBottom: 32,
    },
    buttonText: {
        color: '#007AFF',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    infoContainer: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.3)',
        paddingTop: 20,
    },
    infoText: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.7)',
        textAlign: 'center',
        marginBottom: 4,
    },
});
