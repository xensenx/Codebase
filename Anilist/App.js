import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('anime'); // 'anime' or 'character'
  const [anime, setAnime] = useState(null);
  const [character, setCharacter] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAnimeSearch = async () => {
    setLoading(true);
    setError('');
    setAnime(null);
    setCharacter(null);

    const query = `
      query {
        Media(search: "${searchQuery}", type: ANIME) {
          title {
            romaji
            english
          }
          description(asHtml: false)
          averageScore
          genres
          coverImage {
            large
          }
          relations {
            edges {
              relationType
              node {
                title {
                  romaji
                  english
                }
              }
            }
          }
        }
      }
    `;

    try {
      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      const json = await response.json();
      if (json.data && json.data.Media) {
        setAnime(json.data.Media);
      } else {
        setError('No anime found.');
      }
    } catch (err) {
      setError('Error fetching anime.');
    } finally {
      setLoading(false);
    }
  };

  const handleCharacterSearch = async () => {
    setLoading(true);
    setError('');
    setAnime(null);
    setCharacter(null);

    const query = `
      query {
        Character(search: "${searchQuery}") {
          name {
            full
            native
          }
          description(asHtml: false)
          image {
            large
          }
          gender
          dateOfBirth {
            month
            day
          }
          age
          media {
            nodes {
              title {
                romaji
                english
              }
              type
            }
          }
        }
      }
    `;

    try {
      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      const json = await response.json();
      if (json.data && json.data.Character) {
        setCharacter(json.data.Character);
      } else {
        setError('No character found.');
      }
    } catch (err) {
      setError('Error fetching character.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (searchType === 'anime') {
      handleAnimeSearch();
    } else {
      handleCharacterSearch();
    }
  };

  const formatDescription = (description) => {
    if (!description) return '';
    // Replace <br> tags with line breaks for better display
    return description.replace(/<br>/g, '\n').replace(/<br\/>/g, '\n').replace(/<br \/>/g, '\n');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.warningBox}>
        <Text style={styles.warningText}>
          ⚠️ This app pulls data directly from AniList. Content is uncensored and may include explicit material.
        </Text>
      </View>

      <Text style={styles.title}>AniSearch</Text>

      <View style={styles.searchTypeContainer}>
        <TouchableOpacity
          style={[
            styles.searchTypeButton,
            searchType === 'anime' && styles.activeSearchType,
          ]}
          onPress={() => setSearchType('anime')}
        >
          <Text style={styles.searchTypeText}>Search Anime</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.searchTypeButton,
            searchType === 'character' && styles.activeSearchType,
          ]}
          onPress={() => setSearchType('character')}
        >
          <Text style={styles.searchTypeText}>Search Character</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.input}
        placeholder={`Search for ${searchType}`}
        placeholderTextColor="#aaa"
        onChangeText={setSearchQuery}
        value={searchQuery}
      />

      <Button 
        title={`Search ${searchType === 'anime' ? 'Anime' : 'Character'}`} 
        onPress={handleSearch} 
        color="#6a5acd" 
      />

      {loading && <Text style={styles.loading}>Loading...</Text>}
      {error && <Text style={styles.error}>{error}</Text>}

      {anime && (
        <View style={styles.result}>
          <Text style={styles.animeTitle}>
            {anime.title.english || anime.title.romaji}
          </Text>
          <Image
            source={{ uri: anime.coverImage.large }}
            style={styles.image}
          />
          
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>⭐ Rating</Text>
            <Text style={styles.infoContent}>{anime.averageScore}/100</Text>
          </View>
          
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>🎭 Genres</Text>
            <Text style={styles.infoContent}>{anime.genres.join(', ')}</Text>
          </View>
          
          {anime.relations.edges.length > 0 && (
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>📺 Related</Text>
              <View style={styles.relatedList}>
                {anime.relations.edges.map((rel, index) => (
                  <Text key={index} style={styles.relatedItem}>
                    • {rel.relationType}: {rel.node.title.english || rel.node.title.romaji}
                  </Text>
                ))}
              </View>
            </View>
          )}
          
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Synopsis</Text>
            <Text style={styles.description}>
              {formatDescription(anime.description)}
            </Text>
          </View>
        </View>
      )}

      {character && (
        <View style={styles.result}>
          <Text style={styles.animeTitle}>
            {character.name.full}
            {character.name.native && ` (${character.name.native})`}
          </Text>
          <Image
            source={{ uri: character.image.large }}
            style={styles.image}
          />
          
          <View style={styles.infoCardRow}>
            {character.gender && (
              <View style={[styles.infoCard, styles.infoCardHalf]}>
                <Text style={styles.infoTitle}>Gender</Text>
                <Text style={styles.infoContent}>{character.gender}</Text>
              </View>
            )}
            
            {character.age && (
              <View style={[styles.infoCard, styles.infoCardHalf]}>
                <Text style={styles.infoTitle}>Age</Text>
                
                <Text style={styles.infoContent}>{character.age}</Text>
              </View>
            )}
          </View>
          
          {character.dateOfBirth && (character.dateOfBirth.month || character.dateOfBirth.day) && (
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Birthday</Text>
              <Text style={styles.infoContent}>
                {character.dateOfBirth.month && character.dateOfBirth.day 
                  ? `${character.dateOfBirth.month}/${character.dateOfBirth.day}`
                  : character.dateOfBirth.month 
                    ? `Month: ${character.dateOfBirth.month}` 
                    : `Day: ${character.dateOfBirth.day}`}
              </Text>
            </View>
          )}
          
          {character.media && character.media.nodes.length > 0 && (
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Appears In</Text>
              <View style={styles.relatedList}>
                {character.media.nodes.slice(0, 10).map((media, index) => (
                  <Text key={index} style={styles.relatedItem}>
                    • {media.title.english || media.title.romaji} ({media.type})
                  </Text>
                ))}
                {character.media.nodes.length > 10 && (
                  <Text style={styles.relatedItem}>• And {character.media.nodes.length - 10} more...</Text>
                )}
              </View>
            </View>
          )}
          
          {character.description && (
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Background</Text>
              <Text style={styles.description}>
                {formatDescription(character.description)}
              </Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  title: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  warningBox: {
    backgroundColor: '#ff4444',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  warningText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  searchTypeContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  searchTypeButton: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    marginHorizontal: 5,
  },
  activeSearchType: {
    backgroundColor: '#6a5acd',
  },
  searchTypeText: {
    color: '#fff',
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#1e1e1e',
    color: '#fff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  loading: {
    color: '#aaa',
    textAlign: 'center',
    marginTop: 10,
  },
  error: {
    color: '#ff7777',
    textAlign: 'center',
    marginTop: 10,
  },
  result: {
    marginTop: 20,
    marginBottom: 40,
  },
  animeTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  image: {
    width: '100%',
    height: 300,
    borderRadius: 10,
    marginBottom: 15,
  },
  infoCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  infoCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoCardHalf: {
    width: '48%',
  },
  infoTitle: {
    color: '#6a5acd',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  infoContent: {
    color: '#eee',
    fontSize: 14,
  },
  relatedList: {
    marginTop: 5,
  },
  relatedItem: {
    color: '#ddd',
    marginBottom: 3,
    fontSize: 13,
  },
  description: {
    color: '#eee',
    lineHeight: 20,
  },
});