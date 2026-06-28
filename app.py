from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import random
import json
import os

app = Flask(__name__)
CORS(app)

# File to store progress
PROGRESS_FILE = 'game_progress.json'

def load_progress():
    """Load user progress from file"""
    try:
        if os.path.exists(PROGRESS_FILE):
            with open(PROGRESS_FILE, 'r') as f:
                return json.load(f)
    except:
        pass
    return {'max_level': 1, 'completed_levels': []}

def save_progress(progress):
    """Save user progress to file"""
    try:
        with open(PROGRESS_FILE, 'w') as f:
            json.dump(progress, f)
    except:
        pass

# Game state storage
game_states = {}

class MemoryGame:
    def __init__(self, level=1):
        self.level = level
        self.num_pairs = self.get_pairs_for_level(level)
        self.grid_size = self.get_grid_size()
        self.cards = self.generate_cards()
        self.flipped = []
        self.matched = []
        self.moves = 0
        self.game_over = False
        self.is_processing = False  # Prevent clicks while processing
        self.first_card = None
        self.second_card = None
        
    def get_pairs_for_level(self, level):
        """Calculate number of pairs based on level"""
        # Level 1: 4 pairs, Level 2: 6, Level 3: 8, Level 4: 10...
        return 4 + (level - 1) * 2
    
    def get_grid_size(self):
        """Calculate grid size based on number of pairs"""
        total_cards = self.num_pairs * 2
        # Find best grid layout
        cols = 4
        while total_cards % cols != 0 and cols < total_cards:
            cols += 1
        if cols > 6:
            cols = 6
        rows = total_cards // cols
        if rows * cols < total_cards:
            rows += 1
        return rows, cols
    
    def generate_cards(self):
        """Generate card pairs with unique values"""
        # Each pair has same value (1, 2, 3, ...)
        values = list(range(1, self.num_pairs + 1)) * 2
        random.shuffle(values)
        return [{'id': i, 'value': val, 'flipped': False, 'matched': False} 
                for i, val in enumerate(values)]
    
    def flip_card(self, card_id):
        """Flip a card and check for matches"""
        if self.game_over or self.is_processing:
            return {'error': 'Game is processing'}
        
        card = self.cards[card_id]
        
        # Can't flip already flipped or matched cards
        if card['flipped'] or card['matched']:
            return {'error': 'Card already flipped or matched'}
        
        # Can't flip more than 2 cards at a time
        flipped_count = sum(1 for c in self.cards if c['flipped'] and not c['matched'])
        if flipped_count >= 2:
            return {'error': 'Already two cards flipped'}
        
        # Flip the card
        card['flipped'] = True
        self.moves += 1
        
        # Check if we have two cards flipped
        flipped_cards = [c for c in self.cards if c['flipped'] and not c['matched']]
        
        if len(flipped_cards) == 2:
            self.is_processing = True
            # Check if they match
            if flipped_cards[0]['value'] == flipped_cards[1]['value']:
                # MATCH FOUND!
                for c in flipped_cards:
                    c['matched'] = True
                    c['flipped'] = False
                self.is_processing = False
                
                # Check if level is complete
                if all(c['matched'] for c in self.cards):
                    self.game_over = True
                    return {
                        'success': True,
                        'matched': True,
                        'game_complete': True,
                        'moves': self.moves,
                        'cards': self.cards,
                        'level': self.level
                    }
                
                return {
                    'success': True,
                    'matched': True,
                    'game_complete': False,
                    'moves': self.moves,
                    'cards': self.cards
                }
            else:
                # NO MATCH - Keep them flipped temporarily
                # They will be unflipped by the frontend
                return {
                    'success': True,
                    'matched': False,
                    'game_complete': False,
                    'moves': self.moves,
                    'cards': self.cards,
                    'card1': flipped_cards[0]['id'],
                    'card2': flipped_cards[1]['id']
                }
        
        return {
            'success': True,
            'matched': False,
            'game_complete': False,
            'moves': self.moves,
            'cards': self.cards
        }
    
    def reset_flipped(self, card1_id, card2_id):
        """Unflip two cards (called when no match)"""
        if not self.cards[card1_id]['matched']:
            self.cards[card1_id]['flipped'] = False
        if not self.cards[card2_id]['matched']:
            self.cards[card2_id]['flipped'] = False
        self.is_processing = False
        return self.cards

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/progress', methods=['GET'])
def get_progress():
    """Get user progress"""
    progress = load_progress()
    return jsonify(progress)

@app.route('/api/new_game', methods=['POST'])
def new_game():
    """Start a new game"""
    data = request.json
    level = data.get('level', 1)
    
    # Check if user has access to this level
    progress = load_progress()
    max_level = progress.get('max_level', 1)
    
    if level > max_level:
        return jsonify({
            'error': f'Level {level} is locked. Complete Level {max_level} first!'
        })
    
    game_id = str(random.randint(100000, 999999))
    game = MemoryGame(level)
    game_states[game_id] = game
    
    return jsonify({
        'game_id': game_id,
        'level': level,
        'num_pairs': game.num_pairs,
        'grid_rows': game.grid_size[0],
        'grid_cols': game.grid_size[1],
        'cards': game.cards,
        'max_level': max_level
    })

@app.route('/api/flip_card', methods=['POST'])
def flip_card():
    """Flip a card"""
    data = request.json
    game_id = data.get('game_id')
    card_id = data.get('card_id')
    
    if game_id not in game_states:
        return jsonify({'error': 'Game not found'})
    
    game = game_states[game_id]
    result = game.flip_card(card_id)
    
    # If game is complete, save progress
    if result.get('game_complete'):
        progress = load_progress()
        level = result.get('level')
        if level >= progress.get('max_level', 1):
            progress['max_level'] = level + 1
            if 'completed_levels' not in progress:
                progress['completed_levels'] = []
            if level not in progress['completed_levels']:
                progress['completed_levels'].append(level)
            save_progress(progress)
        result['max_level'] = progress['max_level']
        # Remove game from memory
        del game_states[game_id]
    
    return jsonify(result)

@app.route('/api/reset_flipped', methods=['POST'])
def reset_flipped():
    """Reset flipped cards after no match"""
    data = request.json
    game_id = data.get('game_id')
    card1 = data.get('card1')
    card2 = data.get('card2')
    
    if game_id in game_states:
        game = game_states[game_id]
        game.reset_flipped(card1, card2)
        return jsonify({
            'success': True,
            'cards': game.cards
        })
    
    return jsonify({'error': 'Game not found'})

@app.route('/api/reset_progress', methods=['POST'])
def reset_progress():
    """Reset all progress"""
    save_progress({'max_level': 1, 'completed_levels': []})
    return jsonify({'success': True})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)