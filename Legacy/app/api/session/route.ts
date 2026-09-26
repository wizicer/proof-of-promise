import { NextResponse } from "next/server";
import { currentPerson, logout } from "@/lib/store";
export const runtime="nodejs";
export async function GET(){return NextResponse.json({authenticated:!!(await currentPerson())});}
export async function DELETE(){await logout();return NextResponse.json({success:true});}
