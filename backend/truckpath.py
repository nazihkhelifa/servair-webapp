from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Tuple
import geopandas as gpd
import networkx as nx
from shapely.geometry import LineString
import math
import os

router = APIRouter()

# Data models
class Stop(BaseModel):
    name: str
    coordinates: Tuple[float, float]  # (lon, lat)

class PathRequest(BaseModel):
    stops: List[Stop]

class PathResponse(BaseModel):
    path: List[Tuple[float, float]]  # List of (lon, lat) coordinates
    total_distance: float
    node_count: int
    message: str

class ETAResponse(BaseModel):
    total_time_minutes: float
    segment_times: List[float]
    average_speed_kmh: float
    message: str

# Global graph variable to avoid rebuilding on every request
G = None
gdf = None

# Default truck speed if maxspeed not available (km/h)
DEFAULT_SPEED_KMH = 20

def speed_to_mps(speed):
    """Convert speed to meters per second"""
    if speed is None:
        speed = DEFAULT_SPEED_KMH
    elif isinstance(speed, str):
        # Extract digits from speed string (e.g., "30 km/h" -> 30)
        speed = int(''.join(c for c in speed if c.isdigit()))
    return speed / 3.6  # Convert km/h to m/s

def initialize_graph():
    """Initialize the graph from GeoJSON data - exactly like the Colab code"""
    global G, gdf
    
    try:
        # Get the path to the GeoJSON file
        current_dir = os.path.dirname(os.path.abspath(__file__))
        geojson_path = os.path.join(current_dir, "..", "public", "cdg_private_service_roads.geojson")
        
        # Load CDG private roads GeoJSON
        gdf = gpd.read_file(geojson_path)
        
        # Build graph - exactly like the Colab code
        G = nx.Graph()
        
        # Haversine distance (meters) for edge weights
        def haversine(lon1, lat1, lon2, lat2):
            R = 6371000
            phi1, phi2 = math.radians(lat1), math.radians(lat2)
            dphi = math.radians(lat2 - lat1)
            dlambda = math.radians(lon2 - lon1)
            a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
            return 2*R*math.atan2(math.sqrt(a), math.sqrt(1-a))
        
        # Build graph edges - exactly like the Colab code
        for _, row in gdf.iterrows():
            if isinstance(row.geometry, LineString):
                coords = list(row.geometry.coords)
                for i in range(len(coords)-1):
                    (x1, y1), (x2, y2) = coords[i], coords[i+1]
                    dist = haversine(x1, y1, x2, y2)
                    G.add_edge((x1, y1), (x2, y2), weight=dist)
        
        print(f"Graph built with {len(G.nodes)} nodes and {len(G.edges)} edges")
        return True
        
    except Exception as e:
        print(f"Error initializing graph: {e}")
        return False

def nearest_node(G, point):
    """Find the nearest node in the graph to a given point - exactly like the Colab code"""
    lon, lat = point
    return min(G.nodes, key=lambda n: haversine(lon, lat, n[0], n[1]))

def haversine(lon1, lat1, lon2, lat2):
    """Calculate haversine distance between two points - exactly like the Colab code"""
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return 2*R*math.atan2(math.sqrt(a), math.sqrt(1-a))

def heuristic(n1, n2):
    """Heuristic function for A* algorithm - exactly like the Colab code"""
    return haversine(n1[0], n1[1], n2[0], n2[1])

@router.post("/calculate", response_model=PathResponse)
async def calculate_truck_path(request: PathRequest):
    """Calculate the optimal truck path using A* algorithm with ETA calculation"""
    global G, gdf
    
    print(f"Received request with {len(request.stops)} stops")
    
    try:
        if G is None:
            print("Graph is None, initializing...")
            if not initialize_graph():
                print("Failed to initialize graph")
                raise HTTPException(status_code=500, detail="Failed to initialize graph")
            print("Graph initialized successfully")
        
        if len(request.stops) < 2:
            raise HTTPException(status_code=400, detail="Need at least 2 stops")
        
        print(f"Graph has {len(G.nodes)} nodes and {len(G.edges)} edges")
        # Convert stops to the format expected by the algorithm - exactly like the Colab code
        stops = [(stop.name, stop.coordinates) for stop in request.stops]
        
        print(f"Computing multi-stop route for {len(stops)} stops")
        
        # Compute multi-stop route (ETA calculation removed)
        full_path = []
        total_distance = 0
        
        for i in range(len(stops)-1):
            start_node = nearest_node(G, stops[i][1])
            end_node = nearest_node(G, stops[i+1][1])
            
            print(f"Segment {i}: {stops[i][0]} -> {stops[i+1][0]}")
            print(f"  Start node: {start_node}")
            print(f"  End node: {end_node}")
            
            # Use A* algorithm to find path - exactly like the Colab code
            segment = nx.astar_path(
                G, start_node, end_node,
                heuristic=lambda u,v: heuristic(u,v),
                weight="weight"
            )
            
            print(f"  Segment path: {len(segment)} nodes")
            
            # Calculate distance for this segment
            segment_distance = 0
            for j in range(len(segment)-1):
                s = segment[j]
                e = segment[j+1]
                dist = haversine(s[0], s[1], e[0], e[1])
                segment_distance += dist
            
            total_distance += segment_distance
            
            # Avoid duplicating nodes between segments - exactly like the Colab code
            if i > 0:
                segment = segment[1:]
            full_path.extend(segment)
        
        print(f"✅ Full multi-stop path has {len(full_path)} nodes")
        
        # Convert path to list of coordinates
        path_coordinates = [(lon, lat) for lon, lat in full_path]
        
        return PathResponse(
            path=path_coordinates,
            total_distance=total_distance,
            node_count=len(full_path),
            message=f"✅ Full multi-stop path has {len(full_path)} nodes"
        )
        
    except Exception as e:
        print(f"Error calculating path: {e}")
        raise HTTPException(status_code=500, detail=f"Error calculating path: {str(e)}")

@router.post("/eta", response_model=ETAResponse)
async def calculate_eta(request: PathRequest):
    """Calculate ETA for a given route using speed limits from GeoJSON"""
    global G, gdf
    
    print(f"Calculating ETA for route with {len(request.stops)} stops")
    
    try:
        if G is None or gdf is None:
            print("Graph or GeoDataFrame is None, initializing...")
            if not initialize_graph():
                print("Failed to initialize graph")
                raise HTTPException(status_code=500, detail="Failed to initialize graph")
            print("Graph initialized successfully")
        
        if len(request.stops) < 2:
            raise HTTPException(status_code=400, detail="Need at least 2 stops")
        
        # Convert stops to the format expected by the algorithm
        stops = [(stop.name, stop.coordinates) for stop in request.stops]
        
        print(f"Computing ETA for multi-stop route with {len(stops)} stops")
        
        # Calculate ETA for each segment
        segment_times = []
        total_distance = 0
        
        for i in range(len(stops)-1):
            start_node = nearest_node(G, stops[i][1])
            end_node = nearest_node(G, stops[i+1][1])
            
            print(f"ETA Segment {i}: {stops[i][0]} -> {stops[i+1][0]}")
            
            # Use A* algorithm to find path for this segment
            segment = nx.astar_path(
                G, start_node, end_node,
                heuristic=lambda u,v: heuristic(u,v),
                weight="weight"
            )
            
            print(f"  Segment path: {len(segment)} nodes")
            
            # Calculate distance and time for this segment
            segment_distance = 0
            segment_time = 0
            
            for j in range(len(segment)-1):
                s = segment[j]
                e = segment[j+1]
                dist = haversine(s[0], s[1], e[0], e[1])
                segment_distance += dist
                
                # Find edge in GeoDataFrame to get maxspeed
                try:
                    # Create a LineString for the current edge
                    edge_geom = LineString([s, e])
                    
                    # Find matching road segment in GeoDataFrame
                    mask = gdf.geometry.apply(lambda geom: geom.distance(edge_geom) < 1e-6)
                    if mask.any():
                        row = gdf[mask].iloc[0]
                        speed_mps = speed_to_mps(row.get("maxspeed"))
                        print(f"    Edge speed: {row.get('maxspeed')} -> {speed_mps:.2f} m/s")
                    else:
                        speed_mps = DEFAULT_SPEED_KMH / 3.6
                        print(f"    Edge speed: default {DEFAULT_SPEED_KMH} km/h -> {speed_mps:.2f} m/s")
                    
                    # Calculate time for this edge
                    t = dist / speed_mps
                    segment_time += t
                    
                except Exception as edge_error:
                    print(f"    Error calculating edge time: {edge_error}")
                    # Use default speed if there's an error
                    speed_mps = DEFAULT_SPEED_KMH / 3.6
                    t = dist / speed_mps
                    segment_time += t
            
            total_distance += segment_distance
            segment_times.append(segment_time)
        
        # Calculate total ETA
        total_seconds = sum(segment_times)
        total_minutes = total_seconds / 60
        average_speed_kmh = (total_distance / 1000) / (total_minutes / 60)
        
        print(f"✅ Total ETA: {total_minutes:.2f} minutes")
        print(f"Segment ETAs (seconds): {[f'{t:.1f}s' for t in segment_times]}")
        print(f"Average speed: {average_speed_kmh:.1f} km/h")
        
        return ETAResponse(
            total_time_minutes=total_minutes,
            segment_times=segment_times,
            average_speed_kmh=average_speed_kmh,
            message=f"✅ ETA calculated: {total_minutes:.1f} minutes, Avg speed: {average_speed_kmh:.1f} km/h"
        )
        
    except Exception as e:
        print(f"Error calculating ETA: {e}")
        raise HTTPException(status_code=500, detail=f"Error calculating ETA: {str(e)}")

@router.get("/status")
async def get_status():
    """Get the status of the pathfinding service"""
    global G, gdf
    
    try:
        if G is None:
            print("Graph is None, attempting to initialize...")
            if initialize_graph():
                print("Graph initialized successfully")
            else:
                print("Failed to initialize graph")
                return {"status": "error", "message": "Failed to initialize graph"}
        
        return {
            "status": "ready",
            "graph_nodes": len(G.nodes) if G else 0,
            "graph_edges": len(G.edges) if G else 0,
            "message": "Pathfinding service is ready"
        }
    except Exception as e:
        print(f"Error in status endpoint: {e}")
        return {"status": "error", "message": f"Error: {str(e)}"}

@router.get("/test")
async def test_endpoint():
    """Simple test endpoint to verify the router is working"""
    return {"message": "Truckpath router is working!", "timestamp": "now"}

# Initialize graph when module is imported
if __name__ == "__main__":
    initialize_graph()
else:
    # Initialize graph when the module is imported
    initialize_graph()
