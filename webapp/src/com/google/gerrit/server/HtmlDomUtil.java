// Copyright 2008 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package com.google.gerrit.server;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.SAXException;

import java.io.IOException;
import java.io.InputStream;
import java.io.StringWriter;

import javax.servlet.ServletException;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.transform.OutputKeys;
import javax.xml.transform.Transformer;
import javax.xml.transform.TransformerConfigurationException;
import javax.xml.transform.TransformerException;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;

/** Utility functions to deal with HTML using W3C DOM operations. */
public class HtmlDomUtil {
  /** Standard character encoding we prefer (UTF-8). */
  public static final String ENC = "UTF-8";

  /** DOCTYPE for a standards mode HTML document. */
  public static final String HTML_STRICT =
      "-//W3C//DTD HTML 4.01//EN\" \"http://www.w3.org/TR/REC-html40/strict.dtd";

  /** Convert a document to a UTF-8 byte sequence. */
  public static byte[] toUTF8(final Document hostDoc) throws IOException {
    return toString(hostDoc).getBytes(ENC);
  }

  /** Convert a document to a String, assuming later encoding to UTF-8. */
  public static String toString(final Document hostDoc) throws IOException {
    try {
      final StringWriter out = new StringWriter();
      final DOMSource domSource = new DOMSource(hostDoc);
      final StreamResult streamResult = new StreamResult(out);
      final TransformerFactory tf = TransformerFactory.newInstance();
      final Transformer serializer = tf.newTransformer();
      serializer.setOutputProperty(OutputKeys.ENCODING, ENC);
      serializer.setOutputProperty(OutputKeys.METHOD, "html");
      serializer.setOutputProperty(OutputKeys.INDENT, "no");
      serializer.setOutputProperty(OutputKeys.DOCTYPE_PUBLIC,
          HtmlDomUtil.HTML_STRICT);
      serializer.transform(domSource, streamResult);
      return out.toString();
    } catch (TransformerConfigurationException e) {
      final IOException r = new IOException("Error transforming page");
      r.initCause(e);
      throw r;
    } catch (TransformerException e) {
      final IOException r = new IOException("Error transforming page");
      r.initCause(e);
      throw r;
    }
  }

  /** Find an element by its "id" attribute; null if no element is found. */
  public static Element find(final Node parent, final String name) {
    final NodeList list = parent.getChildNodes();
    for (int i = 0; i < list.getLength(); i++) {
      final Node n = list.item(i);
      if (n instanceof Element) {
        final Element e = (Element) n;
        if (name.equals(e.getAttribute("id"))) {
          return e;
        }
      }
      final Element r = find(n, name);
      if (r != null) {
        return r;
      }
    }
    return null;
  }

  /** Append an HTML &lt;input type="hidden"&gt; to the form. */
  public static void addHidden(final Element form, final String name,
      final String value) {
    final Element in = form.getOwnerDocument().createElement("input");
    in.setAttribute("type", "hidden");
    in.setAttribute("name", name);
    in.setAttribute("value", value);
    form.appendChild(in);
  }

  /** Clone a document so it can be safely modified on a per-request basis. */
  public static Document clone(final Document doc) throws IOException {
    final Document d;
    try {
      d = newBuilder().newDocument();
    } catch (ParserConfigurationException e) {
      throw new IOException("Cannot clone document");
    }
    final Node n = d.importNode(doc.getDocumentElement(), true);
    d.appendChild(n);
    return d;
  }

  /** Parse an XHTML file from our CLASSPATH and return the instance. */
  public static Document parseFile(final String name) throws ServletException {
    final InputStream in;

    in = HtmlDomUtil.class.getClassLoader().getResourceAsStream(name);
    if (in == null) {
      return null;
    }
    try {
      try {
        try {
          return newBuilder().parse(in);
        } catch (SAXException e) {
          throw new ServletException("Error reading " + name, e);
        } catch (ParserConfigurationException e) {
          throw new ServletException("Error reading " + name, e);
        }
      } finally {
        in.close();
      }
    } catch (IOException e) {
      throw new ServletException("Error reading " + name, e);
    }
  }

  private static DocumentBuilder newBuilder()
      throws ParserConfigurationException {
    final DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
    factory.setValidating(false);
    factory.setExpandEntityReferences(false);
    factory.setIgnoringComments(true);
    final DocumentBuilder parser = factory.newDocumentBuilder();
    return parser;
  }
}
