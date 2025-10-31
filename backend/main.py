from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

from truckpath import router as truckpath_router

app = FastAPI(
    title="Servair Pathfinding API",
    description="Private-roads pathfinding (CDG/ORY) for assignments",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(truckpath_router, prefix="/api/truckpath", tags=["truckpath"])


@app.get("/")
async def root():
    return {
        "message": "Servair Pathfinding API running",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat(),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app", host="0.0.0.0", port=5000, reload=True, log_level="info"
    )
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
from datetime import datetime, timedelta
import json
from pathlib import Path
import asyncio
import time

# Import the truckpath router
from truckpath import router as truckpath_router

# Create FastAPI app
app = FastAPI(
    title="Fleet Telemetry API",
    description="Real-time fleet telemetry data streaming from CSV",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the truckpath router
app.include_router(truckpath_router, prefix="/api/truckpath", tags=["truckpath"])

# Enhanced model for coordinates with additional data
class CoordinateData(BaseModel):
    timestamp: str
    longitude: float
    latitude: float
    plateNumber: str
    speed: Optional[float] = None
    heading: Optional[float] = None
    engineState: Optional[str] = None
    locationName: Optional[str] = None
    cabinePosition: Optional[str] = None
    territoriesName: Optional[str] = None
    enterTerritories: Optional[str] = None
    exitTerritories: Optional[str] = None

# Global variables for stream control
is_streaming: bool = False
stream_task: Optional[asyncio.Task] = None
current_row_index: int = 0

def load_telemetry_data() -> pd.DataFrame:
    """Load and preprocess telemetry data from CSV"""
    csv_path = Path(__file__).parent.parent / "telemetry_expanded.csv"
    
    if not csv_path.exists():
        raise FileNotFoundError(f"CSV file not found at {csv_path}")
    
    print(f"📊 Loading CSV from: {csv_path}")
    
    # Load CSV with enhanced columns including the new fields
    df = pd.read_csv(
        csv_path,
        usecols=[
            "dateProcessed", "longitude", "latitude", "speed", 
            "heading", "engineState", "plateNumber", "locationName",
            "Position de la Cabine", "territoriesName", "enterTerritories", "exitTerritories"
        ]
    )
    
    print(f"✅ Loaded {len(df)} rows from CSV")
    
    # Convert dateProcessed to datetime
    df['dateProcessed'] = pd.to_datetime(df['dateProcessed'], errors='coerce')
    
    # Remove rows with invalid coordinates or timestamps
    df = df.dropna(subset=['dateProcessed', 'longitude', 'latitude', 'plateNumber'])
    df = df[(df['longitude'] != 0) & (df['latitude'] != 0)]
    
    # Sort by timestamp (oldest first for sequential streaming)
    df = df.sort_values(by='dateProcessed', ascending=True)
    
    print(f"🧹 Cleaned data: {len(df)} valid rows")
    print(f"📅 Date range: {df['dateProcessed'].min()} to {df['dateProcessed'].max()}")
    print(f"🚗 Unique vehicles: {df['plateNumber'].nunique()}")
    print(f"📍 Unique locations: {df['locationName'].nunique()}")
    print(f"🏗️ Unique cabine positions: {df['Position de la Cabine'].nunique()}")
    print(f"🌍 Unique territories: {df['territoriesName'].nunique()}")
    
    return df

@app.on_event("startup")
async def startup_event():
    """Load data when the application starts"""
    print("🚀 Starting Fleet Telemetry API...")
    try:
        load_telemetry_data()
        print("🎯 API ready! Data will be streamed sequentially from CSV")
        print(f"📍 Starting position: Row {current_row_index + 1}")
    except Exception as e:
        print(f"❌ Error loading data: {e}")
        raise

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Fleet Telemetry API - CSV Streaming",
        "version": "1.0.0",
        "status": "running",
        "description": "Streams historical CSV data as real-time coordinates with enhanced location data",
        "streaming": is_streaming,
        "currentPosition": current_row_index + 1
    }

@app.get("/api/telemetry/stream")
async def stream_telemetry_data():
    """Stream telemetry data sequentially from CSV as if it's happening in real-time"""
    global is_streaming, current_row_index, stream_task
    
    if is_streaming:
        raise HTTPException(status_code=409, detail="Stream is already running")
    
    is_streaming = True
    print(f"🚀 Starting stream from row {current_row_index + 1}")
    
    async def generate_coordinates():
        """Generate coordinate data stream from CSV"""
        global current_row_index, is_streaming
        
        try:
            df = load_telemetry_data()
            
            if df.empty:
                yield f"data: {json.dumps({'error': 'No data available'})}\n\n"
                return
            
            # Check if we've reached the end and need to restart
            if current_row_index >= len(df):
                print("🔄 Reached end of data, restarting from beginning...")
                current_row_index = 0
            
            print(f"📍 Resuming stream from row {current_row_index + 1}/{len(df)}")
            
            while current_row_index < len(df) and is_streaming:
                try:
                    row = df.iloc[current_row_index]
                    
                    # Create enhanced coordinate data with all fields
                    coordinate_data = CoordinateData(
                        timestamp=row['dateProcessed'].isoformat(),
                        longitude=float(row['longitude']),
                        latitude=float(row['latitude']),
                        plateNumber=str(row['plateNumber']),
                        speed=float(row['speed']) if pd.notna(row['speed']) else None,
                        heading=float(row['heading']) if pd.notna(row['heading']) else None,
                        engineState=str(row['engineState']) if pd.notna(row['engineState']) else None,
                        locationName=str(row['locationName']) if pd.notna(row['locationName']) else None,
                        cabinePosition=str(row['Position de la Cabine']) if pd.notna(row['Position de la Cabine']) else None,
                        territoriesName=str(row['territoriesName']) if pd.notna(row['territoriesName']) else None,
                        enterTerritories=str(row['enterTerritories']) if pd.notna(row['enterTerritories']) else None,
                        exitTerritories=str(row['exitTerritories']) if pd.notna(row['exitTerritories']) else None
                    )
                    
                    # Send data
                    yield f"data: {json.dumps(coordinate_data.model_dump())}\n\n"
                    
                    print(f"📍 Sent row {current_row_index + 1}/{len(df)}: {coordinate_data.plateNumber} at {coordinate_data.longitude:.6f}, {coordinate_data.latitude:.6f}")
                    if coordinate_data.locationName:
                        print(f"   📍 Location: {coordinate_data.locationName}")
                    if coordinate_data.territoriesName:
                        print(f"   🌍 Territory: {coordinate_data.territoriesName}")
                    if coordinate_data.cabinePosition:
                        print(f"   🏗️ Cabine: {coordinate_data.cabinePosition}")
                    
                    current_row_index += 1
                    
                    # Wait 2 seconds between data points to simulate real-time
                    await asyncio.sleep(2)
                    
                except Exception as e:
                    print(f"❌ Error processing row {current_row_index}: {e}")
                    current_row_index += 1
                    continue
            
            if not is_streaming:
                print(f"⏹️ Stream stopped at row {current_row_index}")
            else:
                print(f"✅ Stream completed all {len(df)} rows")
                
        except Exception as e:
            print(f"❌ Stream error: {e}")
            yield f"data: {json.dumps({'error': f'Stream error: {str(e)}'})}\n\n"
        finally:
            is_streaming = False
    
    return StreamingResponse(
        generate_coordinates(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*"
        }
    )

@app.post("/api/telemetry/stream/start/{row_number}")
async def start_stream_from_row(row_number: int):
    """Start streaming from a specific row number"""
    global is_streaming, current_row_index
    
    if is_streaming:
        raise HTTPException(status_code=409, detail="Stream is already running")
    
    df = load_telemetry_data() # Load data to check row_number
    if row_number < 0 or row_number >= len(df):
        raise HTTPException(status_code=400, detail=f"Row number must be between 0 and {len(df) - 1}")
    
    current_row_index = row_number
    is_streaming = True
    
    return StreamingResponse(
        stream_telemetry_data_from_row(row_number),
        media_type="text/plain"
    )

async def stream_telemetry_data_from_row(start_row: int):
    """Stream telemetry data starting from a specific row"""
    global is_streaming, current_row_index
    
    try:
        current_row_index = start_row
        df = load_telemetry_data()  # Load fresh data
        
        while current_row_index < len(df) and is_streaming:
            row = df.iloc[current_row_index]
            
            # Create coordinate data with proper error handling
            try:
                coord_data = CoordinateData(
                    timestamp=row['dateProcessed'].isoformat(),
                    longitude=float(row['longitude']),
                    latitude=float(row['latitude']),
                    plateNumber=str(row['plateNumber']),
                    speed=float(row['speed']) if pd.notna(row['speed']) else None,
                    heading=float(row['heading']) if pd.notna(row['heading']) else None,
                    engineState=str(row['engineState']) if pd.notna(row['engineState']) else None,
                    locationName=str(row['locationName']) if pd.notna(row['locationName']) else None,
                    cabinePosition=str(row['Position de la Cabine']) if pd.notna(row['Position de la Cabine']) else None,
                    territoriesName=str(row['territoriesName']) if pd.notna(row['territoriesName']) else None,
                    enterTerritories=str(row['enterTerritories']) if pd.notna(row['enterTerritories']) else None,
                    exitTerritories=str(row['exitTerritories']) if pd.notna(row['exitTerritories']) else None
                )
                
                # Send data
                data = f"data: {coord_data.model_dump_json()}\n\n"
                yield data
                
                # Log the new fields with better debugging
                print(f"Row {current_row_index}: {row.get('locationName', 'N/A')} | {row.get('Position de la Cabine', 'N/A')} | {row.get('territoriesName', 'N/A')}")
                print(f"   📍 Sent: {coord_data.longitude:.6f}, {coord_data.latitude:.6f} | Speed: {coord_data.speed} | Location: {coord_data.locationName}")
                
                current_row_index += 1
                
                # Use asyncio.sleep instead of time.sleep for proper async handling
                await asyncio.sleep(2)  # 2 second delay between points
                
            except Exception as row_error:
                print(f"❌ Error processing row {current_row_index}: {row_error}")
                print(f"   Row data: {row.to_dict()}")
                current_row_index += 1
                continue
            
        if not is_streaming:
            print("Stream stopped")
        else:
            print("Stream completed")
            
    except Exception as e:
        print(f"Error in stream: {e}")
        error_data = f"data: {{\"error\": \"{str(e)}\"}}\n\n"
        yield error_data
    finally:
        is_streaming = False

@app.post("/api/telemetry/stop")
async def stop_stream():
    """Stop the current stream"""
    global is_streaming
    
    if not is_streaming:
        return {"message": "Stream is not running", "currentPosition": current_row_index + 1}
    
    is_streaming = False
    print(f"⏹️ Stream stopped at row {current_row_index + 1}")
    
    return {
        "message": "Stream stopped",
        "currentPosition": current_row_index + 1,
        "status": "stopped"
    }

@app.post("/api/telemetry/reset")
async def reset_stream():
    """Reset stream to beginning"""
    global current_row_index, is_streaming
    
    if is_streaming:
        is_streaming = False
        await asyncio.sleep(2)  # Wait for current stream to stop
    
    current_row_index = 0
    print("🔄 Stream reset to beginning")
    
    return {
        "message": "Stream reset to beginning",
        "currentPosition": 1,
        "status": "reset"
    }

@app.get("/api/telemetry/coordinates")
async def get_current_coordinates():
    """Get current coordinates for all vehicles (latest data point for each)"""
    try:
        df = load_telemetry_data()
        
        if df.empty:
            return {"error": "No data available"}
        
        # Get the latest data point for each vehicle
        latest_data = df.groupby('plateNumber').last().reset_index()
        
        coordinates = []
        for _, row in latest_data.iterrows():
            coordinates.append({
                "timestamp": row['dateProcessed'].isoformat(),
                "longitude": float(row['longitude']),
                "latitude": float(row['latitude']),
                "plateNumber": str(row['plateNumber']),
                "speed": float(row['speed']) if pd.notna(row['speed']) else None,
                "heading": float(row['heading']) if pd.notna(row['heading']) else None,
                "engineState": str(row['engineState']) if pd.notna(row['engineState']) else None,
                "locationName": str(row['locationName']) if pd.notna(row['locationName']) else None,
                "cabinePosition": str(row['Position de la Cabine']) if pd.notna(row['Position de la Cabine']) else None,
                "territoriesName": str(row['territoriesName']) if pd.notna(row['territoriesName']) else None,
                "enterTerritories": str(row['enterTerritories']) if pd.notna(row['enterTerritories']) else None,
                "exitTerritories": str(row['exitTerritories']) if pd.notna(row['exitTerritories']) else None
            })
        
        return {
            "total": len(coordinates),
            "coordinates": coordinates,
            "message": f"Current coordinates for {len(coordinates)} vehicles",
            "streaming": is_streaming,
            "currentPosition": current_row_index + 1
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get coordinates: {str(e)}")

@app.get("/api/telemetry/health")
async def health_check():
    """Health check endpoint"""
    try:
        df = load_telemetry_data()
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "dataLoaded": True, # telemetry_df is no longer global, so this will always be True
            "totalRows": len(df) if not df.empty else 0,
            "uniqueVehicles": df['plateNumber'].nunique() if not df.empty else 0,
            "uniqueLocations": df['locationName'].nunique() if not df.empty else 0,
            "uniqueTerritories": df['territoriesName'].nunique() if not df.empty else 0,
            "currentRowIndex": current_row_index,
            "streaming": is_streaming,
            "dataRange": {
                "min": df['dateProcessed'].min().isoformat() if not df.empty else None,
                "max": df['dateProcessed'].max().isoformat() if not df.empty else None
            }
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "timestamp": datetime.now().isoformat(),
            "error": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=5000,
        reload=True,
        log_level="info"
    )
