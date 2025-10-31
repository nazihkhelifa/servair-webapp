import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const base = process.env.PATHFINDER_URL || 'http://localhost:5000';
    // Forward the request to the Python backend
    const response = await fetch(`${base}/api/truckpath/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Python backend error:', response.status, errorText);
      return NextResponse.json(
        { error: `Backend error: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to communicate with backend' },
      { status: 500 }
    );
  }
}
