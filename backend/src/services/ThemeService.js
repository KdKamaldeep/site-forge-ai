import Theme from '../models/Theme.js';

export class ThemeService {
  /**
   * Create a new theme
   */
  static async createTheme(data) {
    const theme = new Theme(data);
    return await theme.save();
  }

  /**
   * Get theme by ID
   */
  static async getThemeById(id) {
    return await Theme.findById(id);
  }

  /**
   * List all themes
   */
  static async listThemes() {
    return await Theme.find().sort({ name: 1 });
  }

  /**
   * Update theme
   */
  static async updateTheme(id, updates) {
    return await Theme.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    );
  }

  /**
   * Delete theme
   */
  static async deleteTheme(id) {
    return await Theme.findByIdAndDelete(id);
  }
}

