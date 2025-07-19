# Enhanced Excel Visualizer with Multi-Column Chart Comparison

A powerful web-based application for creating interactive charts and visualizations from Excel data with advanced multi-column comparison capabilities.

## Features

### 🚀 Core Functionality
- **Excel File Upload**: Support for .xlsx and .xls files
- **Multiple Chart Types**: Bar, Line, Pie, Doughnut, Radar, Scatter, Bubble, Area, Stacked Bar, and Horizontal Bar charts
- **Interactive Filtering**: Filter data by multiple columns with checkbox interface
- **Multi-Column Comparison**: Compare multiple data columns in a single chart
- **Color Themes**: Default, Pastel, Neon, and Dark color schemes
- **Settings Persistence**: Auto-save and load chart configurations per file

### 📊 Advanced Chart Features
- **Dynamic Chart Switching**: Change chart types on-the-fly
- **Custom Color Controls**: Individual color pickers for chart segments
- **Multi-Pie Charts**: Special handling for pie/doughnut charts in multi-column mode
- **Chart Overviews**: Detailed data summaries with percentages
- **Responsive Design**: Charts adapt to different screen sizes

### 📈 Export & Sharing
- **PNG Download**: Export individual charts as PNG images
- **PowerPoint Export**: Generate comprehensive presentations with charts and data tables
- **Settings Management**: Save and restore chart configurations

### 🎨 User Experience
- **Modern UI**: Clean, professional interface with gradient backgrounds
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Interactive Controls**: Hover effects and smooth transitions
- **Real-time Updates**: Charts update immediately when filters change

## Getting Started

### Prerequisites
- Modern web browser with JavaScript enabled
- Excel files (.xlsx or .xls format)

### Installation
1. Clone or download the project files
2. Open `excel-visualizer.html` in your web browser
3. No additional setup required - all dependencies are loaded via CDN

### Usage

#### 1. Upload Excel File
- Click the file upload area and select your Excel file
- The application will automatically detect columns and prepare the interface

#### 2. Set Up Filters (Optional)
- Select columns you want to filter by
- Click "Load Filter Options" to generate filter checkboxes
- Use checkboxes to include/exclude specific data values

#### 3. Generate Charts
- Select columns to create charts for
- Choose a color theme (optional)
- Click "Generate Charts" to create initial visualizations

#### 4. Customize Charts
- Change chart types using the dropdown in each chart box
- Adjust colors using the color picker
- Enable "Multi-Column Mode" to compare multiple columns

#### 5. Export Results
- Download individual charts as PNG images
- Export all charts to PowerPoint presentation
- Save settings for future use with the same file

## Multi-Column Chart Comparison

### Standard Multi-Column Charts
- Bar, Line, Area, Stacked, and other chart types can display multiple data columns
- Each column gets a different color for easy distinction
- Summary tables show detailed breakdowns

### Multi-Pie Charts
- Special handling for pie and doughnut charts in multi-column mode
- Creates separate pie charts for each selected column
- Maintains consistent color mapping across all pie charts
- Includes comprehensive comparison tables

## Technical Stack

### Frontend Libraries
- **jQuery 3.6.0**: DOM manipulation and event handling
- **Chart.js**: Chart rendering and animation
- **SheetJS (XLSX)**: Excel file parsing
- **PptxGenJS**: PowerPoint export functionality

### Browser Compatibility
- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+

## File Structure

```
├── excel-visualizer.html       # Main application file
├── Js/
│   └── excel-visualizer.js     # Main JavaScript application
├── css/
│   └── excel-visualizer.css    # Styling and responsive design
└── README.md                   # Project documentation
```

## Key Features Explained

### Chart Registry System
- Tracks all created charts for efficient management
- Enables chart switching without data loss
- Supports both single and multi-column chart modes

### Color Preference System
- Remembers custom colors for chart segments
- Persists colors across chart type changes
- Supports theme-based color schemes

### Settings Persistence
- Automatically saves chart configurations to localStorage
- Loads previous settings when reopening the same file
- Includes chart types, selected columns, and multi-column configurations

### Filter System
- Dynamic filter generation based on data
- Real-time chart updates when filters change
- Supports multiple column filtering simultaneously

## Advanced Usage Tips

### Multi-Column Workflows
1. Start with single-column charts to understand your data
2. Enable multi-column mode for comparative analysis
3. Use pie charts for categorical data comparison
4. Apply filters to focus on specific data subsets

### PowerPoint Exports
- Charts are automatically formatted for presentation
- Summary tables are included for detailed analysis
- Filter information is preserved in slide notes

### Performance Optimization
- Large datasets are handled efficiently
- Charts update incrementally rather than full rebuilds
- Memory management prevents browser slowdowns

## Browser Storage

The application uses localStorage to save:
- Chart color preferences
- Chart configurations per Excel file
- Theme selections
- Filter states

Data is stored locally and never transmitted to external servers.

## Troubleshooting

### Common Issues
1. **Charts not displaying**: Ensure JavaScript is enabled and Chart.js is loaded
2. **Excel file not reading**: Check file format (.xlsx or .xls)
3. **Filters not working**: Verify columns contain data and aren't empty
4. **Export not working**: Check popup blockers and download permissions

### Performance Tips
- Use filters to reduce dataset size for better performance
- Avoid creating too many charts simultaneously
- Clear browser cache if charts appear corrupted

## Contributing

This is an open-source project. Feel free to:
- Report bugs and issues
- Suggest new features
- Submit pull requests
- Improve documentation

## License

MIT License - feel free to use and modify for your projects.

## Support

For questions and support:
- Check the troubleshooting section
- Review the browser console for error messages
- Ensure all dependencies are properly loaded